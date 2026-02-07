from typing import List, Optional
from pspf.events.base import GameEvent
from pspf.state.base import GameState

class BaseProcessor:
    def process(self, state: GameState, event: GameEvent) -> List[GameEvent]:
        """
        Process an event against the current state and return derived events.
        Must be deterministic.
        """
        raise NotImplementedError
