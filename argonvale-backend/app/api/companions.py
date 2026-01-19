from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.companion import Companion
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List
import json

import random

router = APIRouter(prefix="/api/companions", tags=["companions"])

class StarterCreate(BaseModel):
    species: str  # e.g., "Emberfang"
    custom_name: str
    element: str  # e.g., "Fire"

class CompanionResponse(BaseModel):
    id: int
    name: str
    species: str
    element: str
    image_url: str
    level: int
    hp: int
    max_hp: int
    strength: int
    defense: int
    speed: int
    is_active: bool
    
    class Config:
        from_attributes = True

# Load creature data
with open("app/data/creatures.json", "r") as f:
    CREATURES_DATA = json.load(f)

@router.post("/create-starter", response_model=CompanionResponse)
def create_starter_companion(
    starter_data: StarterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create starter companion with custom name"""
    if current_user.has_starter:
        raise HTTPException(status_code=400, detail="User already has a starter companion")
    
    # Check if name is already taken
    existing = db.query(Companion).filter(Companion.name == starter_data.custom_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"The name '{starter_data.custom_name}' is already taken by another companion in Argonvale.")

    # Find creature data in starter_companions
    starters = CREATURES_DATA.get("starter_companions", [])
    creature = next((c for c in starters if c["name"] == starter_data.species), None)
    
    if not creature:
        # Fallback to general list just in case
        creature = next((c for c in CREATURES_DATA.get("common_creatures", []) if c["name"] == starter_data.species), None)
        
    if not creature:
        raise HTTPException(status_code=404, detail="Creature not found")
    
    # Use first stat variation
    stats = creature["starting_stats"][0]
    
    # Create companion
    companion = Companion(
        name=starter_data.custom_name,
        species=starter_data.species,
        element=starter_data.element,
        image_url=creature.get("image_url", f"{starter_data.species.lower().replace(' ', '_')}.png"),
        strength=stats["STR"],
        defense=stats["DEF"],
        speed=stats.get("SPD", 10),
        hp=stats["HP"],
        max_hp=stats["HP"],
        level=1,
        is_active=True,
        owner_id=current_user.id
    )
    
    db.add(companion)
    current_user.has_starter = True
    db.commit()
    db.refresh(companion)
    
    return companion

@router.post("/summon", response_model=CompanionResponse)
def summon_companion(
    summon_data: StarterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new companion from selection (costs 500 coins, free for first one)"""
    # Check if this is the first summon (user has only 1 companion - the starter)
    companion_count = db.query(Companion).filter(Companion.owner_id == current_user.id).count()
    summon_cost = 500 if companion_count > 0 else 0 # 0 if they managed to call this without a starter (shouldn't happen but safe)
    
    if current_user.coins < summon_cost:
        raise HTTPException(status_code=400, detail="Insufficient coins to create a companion")
    
    # Check if name is already taken
    existing = db.query(Companion).filter(Companion.name == summon_data.custom_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"The name '{summon_data.custom_name}' is already taken. Every companion in Argonvale must have a unique identity.")

    # Find creature data (could be starter or common for summons)
    all_candidates = CREATURES_DATA.get("starter_companions", []) + CREATURES_DATA.get("common_creatures", [])
    creature = next((c for c in all_candidates if c["name"] == summon_data.species), None)
    
    if not creature:
        raise HTTPException(status_code=404, detail="Creature not found")
    
    # Use first stat variation
    stats = creature["starting_stats"][0]
    
    # Create companion
    companion = Companion(
        name=summon_data.custom_name,
        species=summon_data.species,
        element=summon_data.element,
        image_url=creature.get("image_url", f"{summon_data.species.lower().replace(' ', '_')}.png"),
        strength=stats["STR"],
        defense=stats["DEF"],
        speed=stats.get("SPD", random.randint(5, 12)),
        hp=stats["HP"],
        max_hp=stats["HP"],
        level=1,
        is_active=False, # Summons start on bench
        owner_id=current_user.id
    )
    
    current_user.coins -= summon_cost
    db.add(companion)
    db.commit()
    db.refresh(companion)
    
    return companion
@router.get("/all", response_model=List[CompanionResponse])
def get_all_companions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all companions owned by the user"""
    return db.query(Companion).filter(Companion.owner_id == current_user.id).all()

@router.get("/active", response_model=List[CompanionResponse])
def get_active_companions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active companions (max 4)"""
    return db.query(Companion).filter(
        Companion.owner_id == current_user.id,
        Companion.is_active == True
    ).limit(4).all()

@router.put("/{companion_id}/toggle-active")
def toggle_companion_active(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add/remove companion from active party"""
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()
    
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    if not companion.is_active:
        # Check if user already has 4 active companions
        active_count = db.query(Companion).filter(
            Companion.owner_id == current_user.id,
            Companion.is_active == True
        ).count()
        
        if active_count >= 4:
            raise HTTPException(status_code=400, detail="Maximum 4 active companions allowed")
    
    companion.is_active = not companion.is_active
    db.commit()
    
    return {"message": "Companion status updated", "is_active": companion.is_active}

@router.post("/train/{companion_id}")
def train_companion(
    companion_id: int,
    stat: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Train companion to increase a stat (costs 100 coins)"""
    # Validate stat parameter
    valid_stats = ["strength", "defense", "speed", "hp"]
    if stat not in valid_stats:
        raise HTTPException(status_code=400, detail=f"Invalid stat. Must be one of: {valid_stats}")
    
    # Get companion
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()
    
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    # Check user has enough coins
    training_cost = 100
    if current_user.coins < training_cost:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Increase stat
    if stat == "strength":
        companion.strength += 1
    elif stat == "defense":
        companion.defense += 1
    elif stat == "speed":
        companion.speed += 1
    elif stat == "hp":
        companion.max_hp += 5
        companion.hp += 5  # Also heal the added HP
    
    # Dynamic Level Calculation: Level = floor((STR + DEF + SPD + (MAX_HP / 5)) / 10)
    total_power = companion.strength + companion.defense + companion.speed + (companion.max_hp // 5)
    companion.level = max(1, total_power // 10)
    
    # Deduct coins
    current_user.coins -= training_cost
    
    db.commit()
    db.refresh(companion)
    db.refresh(current_user)
    
    return {
        "message": f"Trained {stat} successfully",
        "companion": {
            "id": companion.id,
            "name": companion.name,
            "strength": companion.strength,
            "defense": companion.defense,
            "speed": companion.speed,
            "hp": companion.hp,
            "max_hp": companion.max_hp,
            "level": companion.level
        },
        "coins_remaining": current_user.coins
    }

@router.post("/heal/{companion_id}")
def heal_companion(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Heal companion to full HP (costs 50 coins)"""
    # Get companion
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()
    
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    # Check if already at full HP
    if companion.hp >= companion.max_hp:
        raise HTTPException(status_code=400, detail="Companion already at full HP")
    
    # Check user has enough coins
    healing_cost = 50
    if current_user.coins < healing_cost:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Heal to full
    companion.hp = companion.max_hp
    
    # Deduct coins
    current_user.coins -= healing_cost
    
    db.commit()
    db.refresh(companion)
    db.refresh(current_user)
    
    return {
        "message": "Companion healed successfully",
        "companion": {
            "id": companion.id,
            "name": companion.name,
            "hp": companion.hp,
            "max_hp": companion.max_hp,
        },
        "coins_remaining": current_user.coins
    }

@router.delete("/{companion_id}")
def abandon_companion(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently abandon a companion (cannot be undone)"""
    # Get companion
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()
    
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    # Check if user has more than 1 companion
    companion_count = db.query(Companion).filter(Companion.owner_id == current_user.id).count()
    if companion_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot abandon your last companion")
    
    # Check if companion is currently training
    if companion.status == "training":
        raise HTTPException(status_code=400, detail="Cannot abandon a companion that is currently training")
    
    # Delete companion
    companion_name = companion.name
    db.delete(companion)
    db.commit()
    
    return {
        "message": f"{companion_name} has been released into the wild. Farewell, brave companion."
    }
