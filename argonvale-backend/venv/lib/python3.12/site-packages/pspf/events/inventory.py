from pspf.events.base import GameEvent

class ItemAcquired(GameEvent):
    item_id: int
    item_template_id: str
    owner_id: int
    quantity: int = 1

class ItemEquipped(GameEvent):
    item_id: int
    companion_id: int
    slot: str
