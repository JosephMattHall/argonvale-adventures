from pydantic import BaseModel

class GameState(BaseModel):
    version: int = 0
    last_event_id: str = ""

    def apply(self, event) -> "GameState":
        """
        Pure function to transition state based on event.
        Must be implemented by subclasses.
        """
        raise NotImplementedError
