from typing import List
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.trading import MarketListingCreated, ItemPurchased
from pspf.state.base import GameState

class TradingState(GameState):
    market_id: str
    listings: List[dict] = []

class TradingProcessor(BaseProcessor):
    def process(self, state: TradingState, event: GameEvent) -> List[GameEvent]:
        if isinstance(event, MarketListingCreated):
            # Add to listings
            return []
        if isinstance(event, ItemPurchased):
            # Process purchase
            return []
        return []
