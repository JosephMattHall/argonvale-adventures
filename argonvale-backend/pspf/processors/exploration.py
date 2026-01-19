import json
import os
import random
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.movement import PlayerMoved, LootFound
from pspf.events.combat import CombatStarted
from pspf.state.base import GameState

# Path to creatures data
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app/data/creatures.json")

class ExplorationProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self.creatures_data = {}
        self._load_data()

    def _load_data(self):
        if os.path.exists(DATA_PATH):
            with open(DATA_PATH, 'r') as f:
                self.creatures_data = json.load(f)

    def process(self, state: GameState, event: GameEvent) -> list[GameEvent]:
        if isinstance(event, PlayerMoved):
             # 1. Deterministic Loot (10% chance)
            loot_roll = random.randint(1, 10)
            events = []
            
            if loot_roll == 1:
                # Found Coins
                amount = random.randint(10, 50)
                events.append(LootFound.create(
                    player_id=event.player_id,
                    zone_id=event.zone_id,
                    coins_found=amount,
                    item_ids_found=[]
                ))

            # 2. Combat Encounter (15% chance)
            combat_roll = random.randint(1, 100)
            if combat_roll <= 15:
                # Load candidates
                candidates = self.creatures_data.get("common_creatures", [])
                if candidates:
                    enemy = random.choice(candidates)
                    stat_block = random.choice(enemy["starting_stats"])
                    
                    events.append(CombatStarted.create(
                        combat_id=f"pve_{event.player_id}_{random.randint(1000,9999)}",
                        attacker_id=event.player_id,
                        defender_id=None, # AI
                        mode="pve",
                        context={
                            "enemy_name": enemy["name"],
                            "enemy_type": enemy["type"],
                            "enemy_hp": stat_block["HP"],
                            "enemy_max_hp": stat_block["HP"],
                            "enemy_stats": stat_block
                        }
                    ))
            
            return events

        return []
