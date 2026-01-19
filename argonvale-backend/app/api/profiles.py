from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.companion import Companion
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

class ProfileUpdate(BaseModel):
    bio: str | None = None
    avatar_url: str | None = None
    title: str | None = None

class ProfileResponse(BaseModel):
    id: int
    username: str
    bio: str
    coins: int
    has_starter: bool
    last_x: int
    last_y: int
    last_zone_id: str
    avatar_url: str
    title: str
    titles_unlocked: str
    
    class Config:
        from_attributes = True

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

@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return current_user

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile"""
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.title is not None:
        current_user.title = profile_data.title
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/{username}", response_model=ProfileResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    """Get another user's public profile"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{username}/companions", response_model=List[CompanionResponse])
def get_user_companions(username: str, db: Session = Depends(get_db)):
    """Get user's active companions (max 4)"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    companions = db.query(Companion).filter(
        Companion.owner_id == user.id,
        Companion.is_active == True
    ).limit(4).all()
    
    return companions
@router.post("/test/add-coins", response_model=ProfileResponse)
def add_test_coins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add 1000 coins for testing"""
    current_user.coins += 1000
    db.commit()
    db.refresh(current_user)
    return current_user
