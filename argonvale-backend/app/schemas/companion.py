from pydantic import BaseModel
from datetime import datetime

class CompanionBase(BaseModel):
    name: str
    species: str
    element: str
    image_url: str

class CompanionResponse(CompanionBase):
    id: int
    level: int
    hp: int
    max_hp: int
    strength: int
    defense: int
    speed: int
    is_active: bool
    status: str
    xp: int
    hunger: int
    last_fed_at: datetime
    
    class Config:
        from_attributes = True
