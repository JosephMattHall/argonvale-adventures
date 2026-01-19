from pspf.events.base import GameEvent
from typing import Literal, Dict, Any

class CompanionSwapped(GameEvent):
    companion_id: int
    new_status: Literal["active", "boarding"]

class CompanionCreated(GameEvent):
    owner_id: int
    name: str
    species: str
    element: str
    stats: Dict[str, int]
    max_hp: int

class ChooseStarter(GameEvent):
    owner_id: int
    species_name: str # e.g. "Emberfang"
