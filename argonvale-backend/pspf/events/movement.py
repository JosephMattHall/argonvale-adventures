from pspf.events.base import GameEvent
from typing import List, Optional

class PlayerMoved(GameEvent):
    player_id: int
    zone_id: str
    x: int
    y: int

class LootFound(GameEvent):
    player_id: int
    zone_id: str
    coins_found: int
    item_ids_found: List[int]

class TeleportPlayer(GameEvent):
    player_id: int
    zone_id: str
    x: int
    y: int
