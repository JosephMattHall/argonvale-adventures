from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import json
import logging
import random
from sqlalchemy.orm import Session
from jose import jwt, JWTError

# App Imports
from app.db.session import SessionLocal
from app.models.user import User
from app.models.companion import Companion
from app.auth.security import SECRET_KEY, ALGORITHM

# PSPF Imports
from pspf.events.base import GameEvent
from pspf.events.movement import PlayerMoved, LootFound
from pspf.events.combat import CombatAction, CombatStarted, TurnProcessed, CombatEnded, JoinPvPQueue
from pspf.events.companion import ChooseStarter, CompanionCreated
from pspf.processors.exploration import ExplorationProcessor
from pspf.processors.combat import CombatProcessor
from pspf.processors.management import CompanionManagementProcessor, CompanionManagementState
from pspf.state.base import GameState

# Setup Logger
logger = logging.getLogger("argonvale")

# Per-User Game State Container
class UserSession:
    def __init__(self, user_id: int):
        self.user_id = user_id
        # Initialize default state
        self.companion_state = CompanionManagementState(owner_id=user_id)
        # We could cache other things here

class GameServer:
    def __init__(self):
        self.active_connections: Dict[WebSocket, UserSession] = {}
        self.exploration = ExplorationProcessor()
        self.combat = CombatProcessor()
        self.management = CompanionManagementProcessor()
        self.pvp_queue: List[Dict[str, Any]] = [] # [{'user_id', 'websocket', 'companion_id', 'username'}]
        
        # We use a global state container just for the processors signature, 
        # but we will dynamically swap context or pass user-specific state.
        # For this MVP refactor, we will pass the UserSession state to processors.

    async def connect(self, websocket: WebSocket) -> bool:
        await websocket.accept()
        
        # 1. Authenticate
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4003)
            return False

        db: Session = SessionLocal()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if not username:
                await websocket.close(code=4003)
                return False
            
            user = db.query(User).filter(User.username == username).first()
            if not user:
                await websocket.close(code=4003)
                return False
            
            # 2. Load State
            session = UserSession(user_id=user.id)
            
            # Load Companion State
            companions = db.query(Companion).filter(Companion.owner_id == user.id).all()
            session.companion_state.total_count = len(companions)
            session.companion_state.active_count = sum(1 for c in companions if c.status == 'active')
            session.companion_state.has_starter = len(companions) > 0 # Simple check for now
            
            self.active_connections[websocket] = session
            logger.info(f"User {username} (ID: {user.id}) connected.")
            
            return True

        except JWTError:
            await websocket.close(code=4003)
            return False
        finally:
            db.close()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            user_id = self.active_connections[websocket].user_id
            # Remove from queue if they disconnect
            self.pvp_queue = [q for q in self.pvp_queue if q['websocket'] != websocket]
            del self.active_connections[websocket]

    async def handle_message(self, websocket: WebSocket, data: str):
        if websocket not in self.active_connections:
            return

        user_session = self.active_connections[websocket]
        user_id = user_session.user_id

        # 1. Initialize Processing Context
        output_events = []
        class TurnContext:
            companion_state = user_session.companion_state
        turn_state = TurnContext()
        
        try:
            payload = json.loads(data)
            msg_type = payload.get("type")
            
            # 2. Map Command -> Event
            
            input_events = []
            
            if msg_type == "Move":
                dx = payload.get("direction", {}).get("dx", 0)
                dy = payload.get("direction", {}).get("dy", 0)
                zone_id = payload.get("zone_id", "town")
                
                # Fetch current pos to calculate absolute
                db_persist = SessionLocal()
                try:
                    user = db_persist.query(User).filter(User.id == user_id).first()
                    if user:
                        # Simple boundary check logic (matching frontend gridSize)
                        # gridSize is 40 for town, 120 for wild.
                        limit = 40 if zone_id == "town" else 120
                        
                        new_x = max(0, min(limit - 1, user.last_x + dx))
                        new_y = max(0, min(limit - 1, user.last_y + dy))
                        
                        user.last_x = new_x
                        user.last_y = new_y
                        user.last_zone_id = zone_id
                        db_persist.commit()
                        
                        input_events.append(PlayerMoved.create(
                            player_id=user_id,
                            zone_id=zone_id, 
                            x=new_x, 
                            y=new_y
                        ))
                finally:
                    db_persist.close()

            elif msg_type == "CombatAction":
                input_events.append(CombatAction.create(
                    combat_id=payload.get("combat_id", "combat_default"),
                    actor_id=user_id,
                    action_type=payload.get("action_type"),
                    stance=payload.get("stance", "normal"),
                    weapon_ids=payload.get("weapon_ids", [])
                ))

            elif msg_type == "ChooseStarter":
                input_events.append(ChooseStarter.create(
                    owner_id=user_id,
                    species_name=payload.get("species_name")
                ))

            elif msg_type == "EnterCombat":
                # Arena Battle Start
                opponent = payload.get("opponent")
                companion_id_raw = payload.get("companion_id")
                
                if companion_id_raw is None:
                    logger.warning(f"User {user_id} tried to enter combat without companion_id")
                    return

                try:
                    companion_id = int(companion_id_raw)
                except (ValueError, TypeError):
                    logger.warning(f"User {user_id} provided invalid companion_id: {companion_id_raw}")
                    return

                logger.info(f"User {user_id} entering combat with companion {companion_id}")
                
                db = SessionLocal()
                try:
                    companion = db.query(Companion).filter(Companion.id == companion_id, Companion.owner_id == user_id).first()
                    if not companion:
                        logger.warning(f"Companion {companion_id} not found for user {user_id}")
                        return
                        
                    logger.info(f"Found companion {companion.name} for user {user_id}")
                    from app.models.item import Item as DBItem
                    equipped_items_db = db.query(DBItem).filter(DBItem.owner_id == user_id, DBItem.is_equipped == True).all()
                    equipped_items = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats} for i in equipped_items_db]
                    
                    combat_id = f"arena_{int(random.random() * 1000000)}"
                    out_evt = CombatStarted.create(
                        combat_id=combat_id,
                        attacker_id=user_id,
                        mode="pve",
                        context={
                            "enemy_name": opponent.get("name"),
                            "enemy_hp": opponent.get("stats", {}).get("HP", 50),
                            "enemy_max_hp": opponent.get("stats", {}).get("HP", 50),
                            "enemy_stats": opponent.get("stats", {"STR": 5, "DEF": 2}),
                            "enemy_weapons": opponent.get("weapons", []),
                            "enemy_items": opponent.get("items", []),
                            "companion_id": companion.id,
                            "companion_name": companion.name,
                            "player_hp": companion.hp,
                            "player_max_hp": companion.max_hp,
                            "player_stats": {
                                "str": companion.strength,
                                "def": companion.defense,
                                "spd": companion.speed
                            },
                            "equipped_items": equipped_items
                        }
                    )
                    output_events.append(out_evt)
                    logger.info(f"Created CombatStarted event {combat_id}")
                    # Initialize session
                    self.combat.process(turn_state, out_evt)
                    logger.info(f"Initialized combat session {combat_id}")
                finally:
                    db.close()

            # 3. Process Events
            
            for event in input_events:
                # Management
                if isinstance(event, ChooseStarter):
                    output_events.extend(self.management.process(turn_state.companion_state, event))
                
                # Exploration
                if isinstance(event, PlayerMoved):
                    # Random Encounter Logic
                    exploration_results = self.exploration.process(turn_state, event)
                    output_events.extend(exploration_results)
                    
                    # If an encounter started, we need to inject real companion stats into CombatStarted context
                    for out_evt in exploration_results:
                        if isinstance(out_evt, CombatStarted):
                            db = SessionLocal()
                            try:
                                active_companion = db.query(Companion).filter(
                                    Companion.owner_id == user_id,
                                    Companion.is_active == True
                                ).first()
                                
                                if active_companion:
                                    from app.models.item import Item as DBItem
                                    equipped_items_db = db.query(DBItem).filter(DBItem.owner_id == user_id, DBItem.is_equipped == True).all()
                                    equipped_items = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats} for i in equipped_items_db]
                                    
                                    out_evt.context.update({
                                        "companion_id": active_companion.id,
                                        "player_hp": active_companion.hp,
                                        "player_max_hp": active_companion.max_hp,
                                        "player_stats": {
                                            "str": active_companion.strength,
                                            "def": active_companion.defense,
                                            "spd": active_companion.speed
                                        },
                                        "equipped_items": equipped_items
                                    })
                                    # Manually trigger the processor to start the session with this context
                                    self.combat.process(turn_state, out_evt)
                            finally:
                                db.close()

                # Combat
                if isinstance(event, (CombatAction)):
                    output_events.extend(self.combat.process(turn_state, event))

                # PvP Matchmaking
                if isinstance(event, JoinPvPQueue):
                    if self.pvp_queue:
                        match = self.pvp_queue.pop(0)
                        opp_id = match['user_id']
                        opp_ws = match['websocket']
                        
                        combat_id = f"pvp_{random.randint(1000, 9999)}"
                        
                        # Load data for both (simple for MVP)
                        db = SessionLocal()
                        try:
                            # We send CombatStarted to BOTH
                            # This is a bit tricky in the current loop, but we can emit manually
                            u1 = db.query(User).get(user_id)
                            u2 = db.query(User).get(opp_id)
                            c1 = db.query(Companion).filter(Companion.owner_id == user_id, Companion.is_active == True).first()
                            c2 = db.query(Companion).filter(Companion.owner_id == opp_id, Companion.is_active == True).first()
                            
                            if c1 and c2:
                                # Start PvP Context
                                context = {
                                    "mode": "pvp",
                                    "p1_name": u1.username,
                                    "p2_name": u2.username,
                                    "p1_companion": c1.name,
                                    "p2_companion": c2.name,
                                    "enemy_name": u2.username, # For the frontend to re-use UI
                                    "enemy_max_hp": c2.max_hp,
                                    "enemy_hp": c2.hp,
                                    "player_max_hp": c1.max_hp,
                                    "player_hp": c1.hp,
                                    "companion_id": c1.id,
                                    "enemy_type": c2.element,
                                    "companion_name": c1.name,
                                    "equipped_items": [] # Load these if needed
                                }
                                
                                evt1 = CombatStarted(combat_id=combat_id, attacker_id=user_id, defender_id=opp_id, mode="pvp", context=context)
                                
                                # Opposite context for P2
                                context2 = context.copy()
                                context2.update({
                                    "enemy_name": u1.username,
                                    "enemy_max_hp": c1.max_hp,
                                    "enemy_hp": c1.hp,
                                    "player_max_hp": c2.max_hp,
                                    "player_hp": c2.hp,
                                    "companion_id": c2.id,
                                    "enemy_type": c1.element,
                                    "companion_name": c2.name
                                })
                                evt2 = CombatStarted(combat_id=combat_id, attacker_id=opp_id, defender_id=user_id, mode="pvp", context=context2)
                                
                                # Send to P2 immediately
                                import asyncio
                                asyncio.create_task(opp_ws.send_text(json.dumps([evt2.model_dump()])))
                                
                                # Add to output for P1 (current user)
                                output_events.append(evt1)
                                
                                # Register in combat processor
                                self.combat.process(None, evt1)
                        finally:
                            db.close()
                    else:
                        db = SessionLocal()
                        u = db.query(User).get(user_id)
                        self.pvp_queue.append({
                            "user_id": user_id,
                            "websocket": websocket,
                            "companion_id": event.companion_id,
                            "username": u.username if u else "Unknown"
                        })
                        db.close()
                        # Notify player they are in queue
                        await websocket.send_text(json.dumps([{"type": "Info", "message": "Searching for a rival..."}]))

            # 4. Feedback Loop & Persistence
            db = SessionLocal()
            try:
                for out_event in output_events:
                    # Persistence: Companion Created
                    if isinstance(out_event, CompanionCreated):
                        new_companion = Companion(
                            owner_id=out_event.owner_id,
                            name=out_event.name,
                            species=out_event.species,
                            element=out_event.element,
                            strength=out_event.stats.get("str", 10),
                            defense=out_event.stats.get("def", 10),
                            speed=out_event.stats.get("spd", 10),
                            hp=out_event.max_hp,
                            max_hp=out_event.max_hp,
                            is_active=True # Starter is active by default
                        )
                        db.add(new_companion)
                        db.commit()
                        
                        user_session.companion_state.total_count += 1
                        user_session.companion_state.active_count += 1
                        user_session.companion_state.has_starter = True

                    # Persistence: Combat Updates
                    if isinstance(out_event, TurnProcessed):
                        # Update companion HP if it was the player taking damage (actor_id=0 is AI)
                        # OR if it was a heal action (actor_id=user_id)
                        if out_event.actor_id == 0 or out_event.actor_id == user_id:
                            session = self.combat.sessions.get(out_event.combat_id)
                            if session and session.companion_id:
                                db.query(Companion).filter(Companion.id == session.companion_id).update({
                                    "hp": session.player_hp
                                })
                                db.commit()

                    if isinstance(out_event, CombatAction) and out_event.action_type == "use_item":
                        # Consume the item
                        from app.models.item import Item as DBItem
                        item = db.query(DBItem).filter(DBItem.id == out_event.item_id, DBItem.owner_id == user_id).first()
                        if item:
                            db.delete(item)
                            db.commit()

                    if isinstance(out_event, CombatEnded):
                        # Reward coins if player won (winner_id != 0)
                        if out_event.winner_id != 0:
                            reward = out_event.loot.get("coins", 0) if out_event.loot else 0
                            user = db.query(User).filter(User.id == user_id).first()
                            if user:
                                user.coins += reward
                                db.commit()
                            
                            # Reward XP to companion
                            session = self.combat.sessions.get(out_event.combat_id)
                            if session and session.companion_id:
                                companion = db.query(Companion).filter(Companion.id == session.companion_id).first()
                                if companion:
                                    companion.xp += out_event.xp_gained
                                    # Level up logic: XP >= level * 100
                                    xp_needed = companion.level * 100
                                    while companion.xp >= xp_needed: # Support multi-level up
                                        companion.level += 1
                                        companion.xp -= xp_needed
                                        # Automatic Stat Scaling: +1 STR, +1 DEF, +5 HP per level
                                        companion.strength += 1
                                        companion.defense += 1
                                        companion.max_hp += 5
                                        companion.hp = companion.max_hp # Fully heal on level up
                                        xp_needed = companion.level * 100
                                    
                                    # Dropped Item Persistence
                                    if out_event.dropped_item:
                                        from app.models.item import Item as DBItem
                                        new_item = DBItem(
                                            name=out_event.dropped_item.get("name"),
                                            item_type=out_event.dropped_item.get("item_type"),
                                            weapon_stats=out_event.dropped_item.get("stats"),
                                            owner_id=user_id,
                                            is_equipped=False
                                        )
                                        db.add(new_item)
                                    
                                    db.commit()

                    if isinstance(out_event, TrainingCompleted):
                        companion = db.query(Companion).filter(Companion.id == out_event.companion_id).first()
                        if companion:
                            if out_event.stat_increased == "strength":
                                companion.strength += out_event.amount
                            elif out_event.stat_increased == "defense":
                                companion.defense += out_event.amount
                            elif out_event.stat_increased == "speed":
                                companion.speed += out_event.amount
                            db.commit()

                    if isinstance(out_event, LootFound):
                        # Found coins during exploration
                        if out_event.coins_found > 0:
                            user = db.query(User).filter(User.id == user_id).first()
                            if user:
                                user.coins += out_event.coins_found
                                db.commit()
                        
                    # Logic Loop: Combat Started (Already handled in Exploration above for random encounters)
                    # if isinstance(out_event, CombatStarted):
                    #    self.combat.process(turn_state, out_event)

                        
            except Exception as e:
                logger.error(f"Persistence Error: {e}")
                db.rollback()
            finally:
                db.close()
            
            # 5. Send Response
            for evt in output_events:
                msg = evt.model_dump(mode='json')
                msg["type"] = evt.__class__.__name__
                await websocket.send_text(json.dumps(msg))
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await websocket.send_text(json.dumps({"error": str(e)}))

game_server = GameServer()
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    success = await game_server.connect(websocket)
    if not success:
        return # Socket already closed
    try:
        while True:
            data = await websocket.receive_text()
            await game_server.handle_message(websocket, data)
    except WebSocketDisconnect:
        game_server.disconnect(websocket)
