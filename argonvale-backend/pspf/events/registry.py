from typing import Dict, Type
from pspf.events.base import GameEvent

class EventRegistry:
    def __init__(self):
        self._events: Dict[str, Type[GameEvent]] = {}

    def register(self, event_type: str, model: Type[GameEvent]):
        self._events[event_type] = model

    def get_model(self, event_type: str) -> Type[GameEvent]:
        return self._events.get(event_type, GameEvent)

event_registry = EventRegistry()
