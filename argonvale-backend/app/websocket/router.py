from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import json
import logging
import random
import time
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
from pspf.events.training import TrainingStarted, TrainingCompleted
from pspf.events.companion import ChooseStarter, CompanionCreated
from pspf.processors.exploration import ExplorationProcessor
from pspf.processors.combat import CombatProcessor
from pspf.processors.management import CompanionManagementProcessor, CompanionManagementState
from pspf.state.base import GameState

# Setup Logger
logger = logging.getLogger("argonvale")

# Per-User Game State Container
class UserSession:
    def __init__(self, user_id: int, username: str):
        self.user_id = user_id
        self.username = username
        self.current_zone = None
        # Initialize default state
        self.companion_state = CompanionManagementState(owner_id=user_id)
        self.last_message_at = 0.0
        # We could cache other things here

class SyncManager:
    def __init__(self):
        # zone_id -> set of websockets
        self.subscriptions: Dict[str, set] = {}

    def subscribe(self, zone_id: str, websocket: WebSocket):
        if zone_id not in self.subscriptions:
            self.subscriptions[zone_id] = set()
        self.subscriptions[zone_id].add(websocket)
        logger.debug(f"Socket subscribed to zone: {zone_id}")

    def unsubscribe(self, zone_id: str, websocket: Optional[WebSocket]):
        if not websocket: return
        for zone in self.subscriptions:
            self.subscriptions[zone].discard(websocket)

    async def broadcast(self, zone_id: str, event_data: dict, exclude: Optional[WebSocket] = None):
        if zone_id not in self.subscriptions:
            return
        
        # Prepare message as list of events for compatibility
        message = json.dumps([event_data])
        
        dead_sockets = []
        for ws in list(self.subscriptions[zone_id]):
            if ws == exclude:
                continue
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.debug(f"Broadcast failed for socket, marking as dead: {e}")
                dead_sockets.append(ws)
        
        for ws in dead_sockets:
            self.unsubscribe(zone_id, ws)

class GameServer:
    def __init__(self):
        self.active_connections: Dict[WebSocket, UserSession] = {}
        self.exploration = ExplorationProcessor()
        self.combat = CombatProcessor()
        self.management = CompanionManagementProcessor()
        self.sync = SyncManager()
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
            session = UserSession(user_id=user.id, username=username)
            session.current_zone = user.last_zone_id
            
            # Load Companion State
            companions = db.query(Companion).filter(Companion.owner_id == user.id).all()
            session.companion_state.total_count = len(companions)
            session.companion_state.active_count = sum(1 for c in companions if c.status == 'active')
            session.companion_state.has_starter = len(companions) > 0 # Simple check for now
            
            self.active_connections[websocket] = session
            # Subscribe to current zone
            self.sync.subscribe(session.current_zone, websocket)
            
            logger.info(f"User {username} (ID: {user.id}) connected.")
            
            return True

        except JWTError:
            await websocket.close(code=4003)
            return False
        finally:
            db.close()

    def get_active_sockets_for_user(self, user_id: int) -> List[WebSocket]:
        sockets = []
        for ws, session in self.active_connections.items():
            if session.user_id == user_id:
                from starlette.websockets import WebSocketState
                if ws.client_state == WebSocketState.CONNECTED:
                    sockets.append(ws)
        return sockets
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            session = self.active_connections[websocket]
            
            # Broadcast Disconnection before removing
            import asyncio
            asyncio.create_task(self.sync.broadcast(session.current_zone, {
                "type": "PlayerDisconnected",
                "player_id": session.user_id
            }))
            
            # Unsubscribe and remove
            self.sync.unsubscribe(session.current_zone, websocket)
            
            # Remove from PvP Queue keys off user id now
            self.pvp_queue = [q for q in self.pvp_queue if q['user_id'] != session.user_id]
            
            del self.active_connections[websocket]


    async def handle_message(self, websocket: WebSocket, data: str):
        if websocket not in self.active_connections:
            return

        user_session = self.active_connections[websocket]
        user_id = user_session.user_id

        # 0. Global Rate Limiting
        now = time.time()
        if now - user_session.last_message_at < 0.02: # 50 msgs/sec max
            # logger.warning(f"Rate limit exceeded for user {user_id}")
            return
        user_session.last_message_at = now

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
                        # 1. Validation Logic
                        now = time.time()
                        
                        # A. Speed Check (Anti-Macro/Hack)
                        # Client sends moves at 100ms interval usually, let's allow 80ms for network jitter
                        if now - (user.last_move_at or 0) < 0.08:
                            logger.warning(f"Speed check failed for user {user_id}")
                            return

                        # B. Distance Check (Anti-Teleport)
                        if abs(dx) + abs(dy) > 1:
                            logger.warning(f"Distance check failed for user {user_id}: dx={dx}, dy={dy}")
                            return

                        # C. Collision Check (Using ExplorationProcessor)
                        new_x = user.last_x + dx
                        new_y = user.last_y + dy
                        
                        if not self.exploration.is_valid_move(zone_id, new_x, new_y):
                            logger.warning(f"Collision check failed for user {user_id} at {new_x},{new_y} in {zone_id}")
                            # Send sync fix back to client
                            await websocket.send_text(json.dumps({
                                "type": "TeleportPlayer",
                                "x": user.last_x,
                                "y": user.last_y,
                                "zone_id": user.last_zone_id
                            }))
                            return

                        # 2. Update State
                        user.last_x = new_x
                        user.last_y = new_y
                        
                        # Handle Zone Change Subscriptions
                        if zone_id != user_session.current_zone:
                            self.sync.unsubscribe(user_session.current_zone, websocket)
                            self.sync.subscribe(zone_id, websocket)
                            user_session.current_zone = zone_id

                        user.last_zone_id = zone_id
                        user.last_move_at = now
                        
                        # Hunger System: Deplete 1 hunger per move for active companions
                        for comp in user.companions:
                            if comp.is_active and comp.status == "active":
                                if comp.hunger > 0:
                                    comp.hunger -= 1
                                else:
                                    # Starvation: Lose 2 health if hunger is 0
                                    comp.hp = max(0, comp.hp - 2)
                                    if comp.hp == 0:
                                        # Optional: Handle companion knockout? 
                                        pass
                        
                        db_persist.commit()
                        
                        # 3. Create Event
                        move_evt = PlayerMoved.create(
                            player_id=user_id,
                            zone_id=zone_id, 
                            x=new_x, 
                            y=new_y
                        )
                        input_events.append(move_evt)

                        # 4. Broadcast to others in the zone
                        await self.sync.broadcast(zone_id, {
                            "type": "PlayerMoved",
                            "player_id": user_id,
                            "username": user_session.username,
                            "zone_id": zone_id,
                            "x": new_x,
                            "y": new_y
                        }, exclude=websocket)

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

            elif msg_type == "JoinPvPQueue":
                companion_id = payload.get("companion_id")
                if companion_id:
                    input_events.append(JoinPvPQueue.create(
                        player_id=user_id,
                        companion_id=int(companion_id)
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

                logger.info(f"User {user_id} entering arena combat with companion {companion_id}")
                
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
                            "enemy_image": opponent.get("image_url", "default_companion.png"),
                            "companion_id": companion.id,
                            "companion_name": companion.name,
                            "companion_image": companion.image_url,
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
                    logger.info(f"Created Arena CombatStarted event {combat_id}")
                    # Initialize session
                    self.combat.process(turn_state, out_evt)
                    logger.info(f"Initialized combat session {combat_id}")
                finally:
                    db.close()

            elif msg_type == "JoinPvEEncounter":
                # User selected a companion for a pre-generated encounter
                combat_id = payload.get("combat_id")
                companion_id_raw = payload.get("companion_id")
                
                if not combat_id or not companion_id_raw:
                    return

                try:
                    companion_id = int(companion_id_raw)
                except:
                    return

                # Get the existing Combat Session (created by ExplorationProcessor)
                session = self.combat.sessions.get(combat_id)
                if not session:
                    # Should update checking logic, but for now log error
                    logger.error(f"Combat session {combat_id} not found for JoinPvEEncounter")
                    return

                db = SessionLocal()
                try:
                    companion = db.query(Companion).filter(Companion.id == companion_id, Companion.owner_id == user_id).first()
                    
                    if companion:
                        # Get Inventory
                        from app.models.item import Item as DBItem
                        equipped_items_db = db.query(DBItem).filter(DBItem.owner_id == user_id, DBItem.is_equipped == True).all()
                        equipped_items = [{
                            "id": i.id, 
                            "name": i.name, 
                            "item_type": i.item_type, 
                            "stats": i.weapon_stats,
                            "effect": i.effect
                        } for i in equipped_items_db]

                        encounter_context = payload.get("context", {})
                        
                        full_context = encounter_context.copy()
                        full_context.update({
                             "companion_id": companion.id,
                             "companion_name": companion.name,
                             "companion_image": companion.image_url,
                             "player_hp": companion.hp,
                             "player_max_hp": companion.max_hp,
                             "player_stats": {
                                 "str": companion.strength,
                                 "def": companion.defense,
                                 "spd": companion.speed
                             },
                             "equipped_items": equipped_items
                        })
                        
                        # Create and Process CombatStarted Event
                        start_event = CombatStarted.create(
                            combat_id=combat_id,
                            attacker_id=user_id,
                            mode="pve",
                            context=full_context
                        )
                        
                        output_events.append(start_event) # IMPORTANT: Send the event to the client!
                        output_events.extend(self.combat.process(turn_state, start_event))
                        logger.info(f"Initialized PvE combat {combat_id} with companion {companion.name}")
                    else:
                        logger.warning(f"Companion {companion_id} not found for user {user_id}")
                        
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

                # Combat
                if isinstance(event, (CombatAction)):
                    output_events.extend(self.combat.process(turn_state, event))

                # PvP Matchmaking
                # PvP Matchmaking
                if isinstance(event, JoinPvPQueue):
                    # Remove self from queue if already there (prevents self-matching)
                    self.pvp_queue = [q for q in self.pvp_queue if q['user_id'] != user_id]
                    
                    match = None
                    opp_sockets = []
                    
                    if self.pvp_queue:
                        # Find a valid opponent (dynamic socket lookup)
                        while self.pvp_queue:
                            candidate = self.pvp_queue.pop(0)
                            opp_id = candidate['user_id']
                            
                            if opp_id == user_id:
                                continue

                            # Dynamic Socket Lookup - Get ALL active sockets
                            opp_sockets = self.get_active_sockets_for_user(opp_id)
                            
                            if opp_sockets:
                                # Found a live one!
                                match = candidate
                                break
                            else:
                                logger.info(f"User {opp_id} in queue is offline. Removing.")
                    
                    if not match:
                        # Add ourselves to queue
                        db = SessionLocal()
                        u = db.query(User).get(user_id)
                        self.pvp_queue.append({
                            "user_id": user_id,
                            # NO WEBSOCKET stored here
                            "companion_id": event.companion_id,
                            "username": u.username
                        })
                        db.close()
                        await websocket.send_text(json.dumps([{"type": "Info", "message": "Searching for a rival..."}]))
                    else:
                        # Proceed with match (user_id vs match['user_id'])
                        opp_id = match['user_id']
                        combat_id = f"pvp_{random.randint(1000, 9999)}"
                        
                        # Load data for both ...
                        db = SessionLocal()
                        try:
                            u1 = db.query(User).get(user_id)
                            u2 = db.query(User).get(opp_id)
                            
                            # Use specific companion IDs from the queue events
                            c1 = db.query(Companion).filter(Companion.id == event.companion_id, Companion.owner_id == user_id).first()
                            c2 = db.query(Companion).filter(Companion.id == match['companion_id'], Companion.owner_id == opp_id).first()
                            
                            if c1 and c2:
                                # ... (existing match logic) ...
                                from app.models.item import Item as DBItem
                                items1 = db.query(DBItem).filter(DBItem.owner_id == user_id, DBItem.is_equipped == True).all()
                                items2 = db.query(DBItem).filter(DBItem.owner_id == opp_id, DBItem.is_equipped == True).all()
                                
                                equipped1 = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats, "effect": i.effect} for i in items1]
                                equipped2 = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats, "effect": i.effect} for i in items2]

                                # Start PvP Context
                                context = {
                                    "mode": "pvp",
                                    "p1_name": u1.username,
                                    "p2_name": u2.username,
                                    "p1_companion": c1.name,
                                    "p2_companion": c2.name,
                                    "enemy_name": u2.username,
                                    "enemy_max_hp": c2.max_hp,
                                    "enemy_hp": c2.hp,
                                    "enemy_stats": {"str": c2.strength, "def": c2.defense, "spd": c2.speed},
                                    "enemy_weapons": equipped2,
                                    "player_max_hp": c1.max_hp,
                                    "player_hp": c1.hp,
                                    "player_stats": {"str": c1.strength, "def": c1.defense, "spd": c1.speed},
                                    "companion_id": c1.id,
                                    "enemy_type": c2.element,
                                    "companion_name": c1.name,
                                    "companion_image": c1.image_url,
                                    "enemy_image": c2.image_url,
                                    "equipped_items": equipped1
                                }
                                
                                evt1 = CombatStarted.create(combat_id=combat_id, attacker_id=user_id, defender_id=opp_id, mode="pvp", context=context)
                                
                                context2 = context.copy()
                                context2.update({
                                    "enemy_name": u1.username,
                                    "enemy_image": c1.image_url,
                                    "enemy_max_hp": c1.max_hp,
                                    "enemy_hp": c1.hp,
                                    "enemy_stats": {"str": c1.strength, "def": c1.defense, "spd": c1.speed},
                                    "enemy_weapons": equipped1,
                                    "player_max_hp": c2.max_hp,
                                    "player_hp": c2.hp,
                                    "player_stats": {"str": c2.strength, "def": c2.defense, "spd": c2.speed},
                                    "companion_id": c2.id,
                                    "companion_name": c2.name,
                                    "companion_image": c2.image_url,
                                    "enemy_type": c1.element,
                                    "equipped_items": equipped2
                                })
                                evt2 = CombatStarted.create(combat_id=combat_id, attacker_id=opp_id, defender_id=user_id, mode="pvp", context=context2)
                                
                                # Broadcast to ALL active sockets for opponent
                                logger.info(f"Broadcasting match event to {len(opp_sockets)} active sockets for user {opp_id}")
                                for ws in opp_sockets:
                                    try:
                                        await ws.send_text(json.dumps([evt2.model_dump(mode='json')]))
                                    except Exception as e:
                                        logger.error(f"Failed to send to one of user {opp_id}'s sockets: {e}")
                                
                                # Add to output for P1 (current user)
                                output_events.append(evt1)
                                
                                # Register in combat processor
                                self.combat.process(None, evt1)
                            else:
                                logger.warning(f"PvP Match Validation Failed: Invalid companions.")
                                if not c1:
                                     await websocket.send_text(json.dumps([{"type": "Error", "message": "Invalid companion selection."}]))
                                     self.pvp_queue.insert(0, match)
                                elif not c2:
                                    self.pvp_queue.append({
                                        "user_id": user_id,
                                        "companion_id": event.companion_id,
                                        "username": u1.username if u1 else "Unknown"
                                    })
                                    await websocket.send_text(json.dumps([{"type": "Info", "message": "Searching for a rival..."}]))

                        finally:
                            db.close()

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
                                if out_event.mode == "pvp":
                                    user.pvp_wins += 1
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
                        
                    # Logic Loop: Combat Started (Now handled for random encounters to register session)
                    if isinstance(out_event, CombatStarted):
                       logger.info(f"Auto-registering random encounter session: {out_event.combat_id}")
                       self.combat.process(turn_state, out_event)

                        
            except Exception as e:
                print(f"Persistence Error: {e}")
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
