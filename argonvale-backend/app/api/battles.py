from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.companion import Companion
from app.auth.security import get_current_user
from app.services.practice_service import generate_practice_opponent
from pydantic import BaseModel
import random
import logging

# We need to access the game server instance to register the session
# This is a bit circular if we import router from router. Solution: Import instance from main or use a singleton pattern.
# For now, we will import it inside the function to avoid circular imports at module level, 
# or rely on the shared instance being importable.
from app.websocket.router import game_server 
from pspf.events.combat import CombatStarted

router = APIRouter(prefix="/api/battles", tags=["battles"])
logger = logging.getLogger(__name__)

class PracticeRequest(BaseModel):
    companion_id: int

@router.post("/practice")
async def start_practice_battle(req: PracticeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Initialize a Practice PVE Battle.
    - Generates opponent
    - Creates Combat Session
    - Returns context for frontend navigation
    """
    companion = db.query(Companion).filter(Companion.id == req.companion_id, Companion.owner_id == current_user.id).first()
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")

    # 1. Generate Opponent
    opponent_context = generate_practice_opponent(db, companion)
    
    # 2. Prepare Match Context
    combat_id = f"practice_{current_user.id}_{random.randint(1000,9999)}"
    
    # 3. Register Session in GameServer (CombatProcessor)
    # We need to create a dummy "CombatStarted" event to initialize the processor
    # But we don't broadcast it yet. The frontend will "join" it via socket.
    
    # We need the user's equipped items for the event context
    from app.models.item import Item
    equipped_items_db = db.query(Item).filter(Item.owner_id == current_user.id, Item.is_equipped == True).all()
    equipped_items = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats, "effect": i.effect} for i in equipped_items_db]

    full_context = opponent_context.copy()
    full_context.update({
        "companion_id": companion.id,
        "companion_name": companion.name,
        "companion_element": companion.element,
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

    # Create the session internally
    evt = CombatStarted.create(
        combat_id=combat_id,
        attacker_id=current_user.id,
        attacker_companion_id=companion.id,
        mode="PVE_PRACTICE",
        context=full_context
    )
    
    # Register!
    game_server.combat.process(None, evt)
    logger.info(f"Initialized Practice Session {combat_id}")

    return {
        "combat_id": combat_id,
        "context": full_context
    }
