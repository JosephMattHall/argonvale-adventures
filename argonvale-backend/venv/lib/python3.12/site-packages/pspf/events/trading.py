from pspf.events.base import GameEvent

class MarketListingCreated(GameEvent):
    market_id: str
    seller_id: int
    item_id: int
    price: int

class ItemPurchased(GameEvent):
    market_id: str
    listing_id: str
    buyer_id: int
