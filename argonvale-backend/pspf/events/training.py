from pspf.events.base import GameEvent
from datetime import datetime

class TrainingStarted(GameEvent):
    companion_id: int
    duration_hours: int
    stat_to_train: str # strength, defense, speed

class TrainingCompleted(GameEvent):
    companion_id: int
    stat_increased: str
    amount: int
    is_rare_bonus: bool
