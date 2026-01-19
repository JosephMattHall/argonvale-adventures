from typing import List, Dict
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.economy import AuctionCreated, BidPlaced, AuctionClosed
from pspf.state.base import GameState

class AuctionState(GameState):
    auction_id: str
    current_bid: int = 0
    high_bidder_id: int = 0
    is_active: bool = False
    end_time: float = 0.0

class EconomyProcessor(BaseProcessor):
    def process(self, state: AuctionState, event: GameEvent) -> List[GameEvent]:
        if isinstance(event, AuctionCreated):
            # Init state (conceptually)
            return []
            
        if isinstance(event, BidPlaced):
            if not state.is_active:
                return [] # Too late
            
            if event.amount > state.current_bid:
                # Valid Bid
                # Logic to return coins to previous bidder?
                # In a real event sourcing system, we'd emit logic to refund.
                
                # We don't emit a specialized event for "BidSuccess" usually,
                # the state update is enough. But for side effects (refunds),
                # we might.
                pass
            return []
            
        # Time-based closure would be handled by a specialized Time Trigger
        # forcing an "CheckAuctionEnd" call.
        
        return []
