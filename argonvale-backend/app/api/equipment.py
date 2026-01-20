from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.item import Item
from app.models.companion import Companion
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/equipment", tags=["equipment"])

@router.get("/inventory", response_model=List[dict])
def get_inventory(current_user: User = Depends(get_current_user)):
    """Get all items owned by the user"""
    return [
        {
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "description": item.description,
            "image_url": item.image_url,
            "category": item.category,
            "weapon_stats": item.weapon_stats,
            "effect": item.effect,
            "is_equipped": item.is_equipped
        } for item in current_user.items
    ]

@router.post("/toggle/{item_id}")
def toggle_equip(item_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    item = db.query(Item).filter(Item.id == item_id, Item.owner_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.is_equipped:
        item.is_equipped = False
    else:
        equipped_count = db.query(Item).filter(Item.owner_id == current_user.id, Item.is_equipped == True).count()
        if equipped_count >= 8:
            raise HTTPException(status_code=400, detail="Cannot equip more than 8 items")
        item.is_equipped = True
    
    db.commit()
    return {"status": "success", "is_equipped": item.is_equipped}

@router.post("/use/{item_id}")
def use_item(item_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    item = db.query(Item).filter(Item.id == item_id, Item.owner_id == current_user.id).first()
    if not item or item.item_type != "potion":
        raise HTTPException(status_code=404, detail="Potion not found")
    
    # Simple heal logic: restore 50 HP to first companion
    companion = current_user.companions[0] if current_user.companions else None
    if companion:
        companion.hp = min(companion.hp + 50, 100) # Assuming 100 max for now
        db.delete(item) # Consume potion
        db.commit()
        return {"status": "healed", "new_hp": companion.hp}
    
    raise HTTPException(status_code=400, detail="No companion to heal")

@router.post("/feed/{item_id}/{companion_id}")
def feed_companion(item_id: int, companion_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    item = db.query(Item).filter(Item.id == item_id, Item.owner_id == current_user.id).first()
    if not item or item.item_type != "food":
        raise HTTPException(status_code=404, detail="Food item not found")
    
    companion = db.query(Companion).filter(Companion.id == companion_id, Companion.owner_id == current_user.id).first()
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    effect = item.effect or {}
    hunger_restore = effect.get("hunger", effect.get("value", 0))
    hp_restore = effect.get("heal", 0)
    
    companion.hunger = min(100, companion.hunger + hunger_restore)
    if hp_restore > 0:
        companion.hp = min(companion.max_hp, companion.hp + hp_restore)
    
    db.delete(item)
    db.commit()
    
    return {
        "status": "success", 
        "message": f"Fed {item.name} to {companion.name}!",
        "new_hunger": companion.hunger,
        "new_hp": companion.hp
    }

@router.post("/seed-test-items")
def seed_items(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    test_items = [
        Item(name="Steel Sword", item_type="weapon", owner_id=current_user.id, weapon_stats={"attack": 15}),
        Item(name="Iron Shield", item_type="shield", owner_id=current_user.id, weapon_stats={"defense": 10}),
        Item(name="Healing Potion", item_type="potion", owner_id=current_user.id),
        Item(name="Great Axe", item_type="weapon", owner_id=current_user.id, weapon_stats={"attack": 25, "speed": -5})
    ]
    db.add_all(test_items)
    db.commit()
    return {"status": "seeded"}
