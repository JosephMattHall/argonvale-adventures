from typing import List, Dict
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.inventory import ItemAcquired, ItemEquipped
from pspf.state.base import GameState

class InventoryState(GameState):
    player_id: int
    items: Dict[int, int] = {} # item_id -> quantity
    equipped: Dict[int, int] = {} # companion_id -> item_id

class InventoryProcessor(BaseProcessor):
    def process(self, state: InventoryState, event: GameEvent) -> List[GameEvent]:
        if isinstance(event, ItemAcquired):
            # Logic to add item
            return []
        if isinstance(event, ItemEquipped):
            # Logic to equip
            return []
        return []
