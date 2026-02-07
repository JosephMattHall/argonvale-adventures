from pspf.events.base import GameEvent

class ZoneEntered(GameEvent):
    zone_id: str
    companion_id: int

class EncounterTriggered(GameEvent):
    zone_id: str
    encounter_id: str
    difficulty: int
