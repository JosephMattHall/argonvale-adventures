from typing import List
import random
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.training import TrainingStarted, TrainingCompleted
from pspf.state.base import GameState

class TrainingState(GameState):
    companion_id: int
    is_training: bool = False
    start_time: float = 0
    target_stat: str = ""

class TrainingProcessor(BaseProcessor):
    def process(self, state: TrainingState, event: GameEvent) -> List[GameEvent]:
        if isinstance(event, TrainingStarted):
            # Logic to start training
            # Calculate Cost based on Level (Placeholder: assume level 1 for now or get from state)
            # 1-10: 2 coins, 10-20: 5 coins, etc.
            level = 1 # In real app, state.companion_level
            cost = 2
            if level >= 10: cost = 5
            if level >= 20: cost = 10
            
            # Emit TrainingStarted with explicit cost paid (for determinism downstream)
            # Note: We aren't checking balance here because we don't have User state here yet.
            # In full PSPF, we'd join UserStream. For now, we assume valid and emit the deduction intent.
            return [] 
            
        if event.event_type == "CheckTrainingCompletion":
            # Real impl would check time.
            # Deterministic RNG based on event ID
            seed = int(event.event_id.replace("-", ""), 16)
            rng = random.Random(seed)
            
            # 10% chance of rare bonus
            is_rare = rng.random() < 0.1
            amount = rng.randint(2, 5) if is_rare else 1
            
            return [TrainingCompleted.create(
                event_type="TrainingCompleted",
                companion_id=state.companion_id,
                stat_increased=state.target_stat,
                amount=amount,
                is_rare_bonus=is_rare
            )]
        return []
