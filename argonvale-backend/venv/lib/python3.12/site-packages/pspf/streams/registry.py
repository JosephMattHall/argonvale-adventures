from typing import Dict, Any, Callable
from pydantic import BaseModel
from pspf.streams.config import StreamConfig

class StreamRegistry:
    def __init__(self):
        self._streams: Dict[str, StreamConfig] = {}
        self._processors: Dict[str, Callable] = {}

    def register_stream(self, name: str, partition_key: str):
        self._streams[name] = StreamConfig(name=name, partition_key=partition_key)

    def register_processor(self, stream_name: str, processor: Callable):
        if stream_name not in self._streams:
            raise ValueError(f"Stream {stream_name} not registered")
        self._processors[stream_name] = processor

registry = StreamRegistry()

# Register defined streams
registry.register_stream("battles", "battle_id")
registry.register_stream("training", "companion_id")
registry.register_stream("trading", "market_id")
registry.register_stream("exploration", "zone_id")
registry.register_stream("inventory", "player_id")
