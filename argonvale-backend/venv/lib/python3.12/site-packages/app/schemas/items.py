from pydantic import BaseModel, Field
from typing import Dict, Optional

class WeaponStats(BaseModel):
    # e.g. {"fire": 10, "earth": 3}
    attack: Dict[str, int] = Field(default_factory=dict)
    
    # e.g. {"physical": 5, "fire": 2}
    defense: Dict[str, int] = Field(default_factory=dict)
    
    # e.g. {"light": 0.5} (50% reflection)
    reflection: Dict[str, float] = Field(default_factory=dict)
    
    # Durability or usage limits could go here
    durability: Optional[int] = None 
    is_consumable: bool = False

class ItemAttributes(BaseModel):
    # Wrapper for all item kinds
    weapon_stats: Optional[WeaponStats] = None
    # Future: potion_effects, material_quality etc.
