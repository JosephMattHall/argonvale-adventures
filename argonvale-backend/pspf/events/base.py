from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid

class GameEvent(BaseModel):
    event_id: str
    timestamp: datetime
    event_type: str
    
    # Partition Keys
    battle_id: Optional[str] = None
    player_id: Optional[int] = None
    companion_id: Optional[int] = None
    zone_id: Optional[str] = None
    market_id: Optional[str] = None

    class Config:
        frozen = True

    @classmethod
    def create(cls, event_type: str = None, **kwargs):
        # Allow subclasses to set their own event_type default if missing
        if event_type is None and hasattr(cls, "event_type"):
             event_type = cls.event_type # type: ignore
        
        # Fallback if not provided
        if event_type is None:
             event_type = cls.__name__

        return cls(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            event_type=event_type,
            **kwargs
        )
