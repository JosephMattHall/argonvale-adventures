from pspf.events.base import GameEvent
from typing import List

class AuctionCreated(GameEvent):
    auction_id: str # This maps to DB ID conceptually, but in PSPF is the stream key
    seller_id: int
    item_id: int
    start_price: int
    end_time_timestamp: float

class BidPlaced(GameEvent):
    auction_id: str
    bidder_id: int
    amount: int

class AuctionClosed(GameEvent):
    auction_id: str
    winner_id: int
    final_price: int
    item_id: int

class TradeOfferMade(GameEvent):
    lot_id: str
    offerer_id: int
    offered_coins: int
    offered_item_ids: List[int]

class TradeOfferAccepted(GameEvent):
    lot_id: str
    offer_id: str
