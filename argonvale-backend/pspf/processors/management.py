import json
import random
import os
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.companion import CompanionSwapped, CompanionCreated, ChooseStarter
from pspf.state.base import GameState

# Path to creatures data
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app/data/creatures.json")

class CompanionManagementState(GameState):
    owner_id: int
    active_count: int = 0
    total_count: int = 0
    has_starter: bool = False

class CompanionManagementProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self.creatures_data = {}
        self._load_data()

    def _load_data(self):
        if os.path.exists(DATA_PATH):
            with open(DATA_PATH, 'r') as f:
                self.creatures_data = json.load(f)

    def process(self, state: CompanionManagementState, event: GameEvent) -> list[GameEvent]:
        if isinstance(event, ChooseStarter):
            if state.has_starter or state.total_count > 0:
                # Already has companions/starter
                return []
            
            # Find starter data
            starters = self.creatures_data.get("starter_companions", [])
            choice = next((s for s in starters if s["name"] == event.species_name), None)
            
            if not choice:
                return [] # Invalid starter

            # Roll stats (pick one of the 3 presets)
            stat_block = random.choice(choice["starting_stats"])
            
            # Create the companion
            return [CompanionCreated.create(
                owner_id=event.owner_id,
                name=choice["name"], # Default name = species name
                species=choice["name"],
                element=choice["type"],
                image_url=choice.get("image_url", "default_companion.png"),
                stats={
                    "str": stat_block["STR"],
                    "def": stat_block["DEF"]
                },
                max_hp=stat_block["HP"]
            )]

        if isinstance(event, CompanionCreated):
            # This would update state in a real system
            # For this MVP, we rely on the event emission to trigger DB saves elsewhere
            pass

        if isinstance(event, CompanionSwapped):
            if event.new_status == "active":
                if state.active_count >= 4:
                    return []
            return [event] # Re-emit to confirm valid swap
            
        return []
