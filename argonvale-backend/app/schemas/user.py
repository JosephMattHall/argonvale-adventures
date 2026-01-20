from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: str
    role: str

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class ProfileResponse(BaseModel):
    id: int
    username: str
    bio: str
    coins: int
    role: str
    has_starter: bool
    last_x: int
    last_y: int
    last_zone_id: str
    avatar_url: str
    title: str
    titles_unlocked: str
    
    class Config:
        from_attributes = True
