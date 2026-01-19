from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.models.user import User
from app.models.companion import Companion
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/management", tags=["management"])

class LeaderboardUser(BaseModel):
    username: str
    pvp_wins: int
    avatar_url: str
    title: str

    class Config:
        from_attributes = True

class LeaderboardCompanion(BaseModel):
    name: str
    species: str
    level: int
    element: str
    owner_name: str
    image_url: str

    class Config:
        from_attributes = True

class TrainingStatusResponse(BaseModel):
    companion_id: int
    status: str
    busy_until: Optional[datetime]
    time_remaining: Optional[int] # Seconds

@router.get("/leaderboards/pvp", response_model=List[LeaderboardUser])
def get_pvp_leaderboard(db: Session = Depends(get_db)):
    """Get the top 10 players by PvP wins"""
    return db.query(User).order_by(desc(User.pvp_wins)).limit(10).all()

@router.get("/leaderboards/companions", response_model=List[LeaderboardCompanion])
def get_companion_leaderboard(db: Session = Depends(get_db)):
    """Get the top 10 companions by level"""
    companions = db.query(Companion).order_by(desc(Companion.level)).limit(10).all()
    
    # We need to map owner name manually or use a join
    results = []
    for c in companions:
        results.append({
            "name": c.name,
            "species": c.species,
            "level": c.level,
            "element": c.element,
            "owner_name": c.owner.username if c.owner else "Unknown",
            "image_url": c.image_url
        })
    return results

@router.post("/train/{companion_id}")
def start_idle_training(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start timer-based training for a companion. Duration = Level * 1 hour."""
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()

    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    if companion.status != "active" and companion.status != "boarding":
        raise HTTPException(status_code=400, detail=f"Companion is currently {companion.status}")

    # Calculate duration (1 hour per level)
    # For testing purposes, we might want to make it shorter? 
    # But the user specifically said "starting at an hour each training course"
    duration_hours = companion.level
    finish_time = datetime.utcnow() + timedelta(hours=duration_hours)

    companion.status = "training"
    companion.busy_until = finish_time
    
    db.commit()
    db.refresh(companion)

    return {
        "message": f"Training started. Your companion will be busy for {duration_hours} hour(s).",
        "finish_time": companion.busy_until
    }

@router.post("/claim/{companion_id}")
def claim_training_rewards(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Claim XP rewards after training is finished"""
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()

    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    
    if companion.status != "training":
        raise HTTPException(status_code=400, detail="Companion is not in training")

    if datetime.utcnow() < companion.busy_until:
        time_left = companion.busy_until - datetime.utcnow()
        raise HTTPException(
            status_code=400, 
            detail=f"Training is not finished yet. {int(time_left.total_seconds() // 60)} minutes remaining."
        )

    # Calculate XP reward
    # Level 1 (1 hour) -> Base 100 XP
    # Level 2 (2 hours) -> 200 XP, etc.
    xp_reward = companion.level * 100
    
    companion.xp += xp_reward
    companion.status = "active"
    companion.busy_until = None
    
    # Handle Level Up (simplified, usually handled by a processor/method)
    # Let's check if they leveled up
    old_level = companion.level
    while companion.xp >= 100 * (companion.level ** 1.5):
        companion.level += 1
        # Automatic stat increases
        companion.strength += 1
        companion.defense += 1
        companion.max_hp += 5
        companion.hp = companion.max_hp

    db.commit()
    db.refresh(companion)

    return {
        "message": "Training complete!",
        "xp_gained": xp_reward,
        "new_level": companion.level,
        "leveled_up": companion.level > old_level
    }

@router.get("/status/{companion_id}", response_model=TrainingStatusResponse)
def get_companion_management_status(
    companion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current training/expedition status of a companion"""
    companion = db.query(Companion).filter(
        Companion.id == companion_id,
        Companion.owner_id == current_user.id
    ).first()

    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")

    time_remaining = 0
    if companion.busy_until and companion.busy_until > datetime.utcnow():
        time_remaining = int((companion.busy_until - datetime.utcnow()).total_seconds())

    return {
        "companion_id": companion.id,
        "status": companion.status,
        "busy_until": companion.busy_until,
        "time_remaining": time_remaining
    }
