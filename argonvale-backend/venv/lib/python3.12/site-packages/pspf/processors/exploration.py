import json
import os
import random
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.movement import PlayerMoved, LootFound
from pspf.events.combat import CombatStarted
from pspf.state.base import GameState

# Path to data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CREATURES_PATH = os.path.join(BASE_DIR, "app/data/creatures.json")
MAPS_DIR = os.path.join(BASE_DIR, "app/data/maps")

class ExplorationProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self.creatures_data = {}
        self.maps_data = {}
        self._load_data()

    def _load_data(self):
        # Load Creatures
        if os.path.exists(CREATURES_PATH):
            with open(CREATURES_PATH, 'r') as f:
                self.creatures_data = json.load(f)
        
        # Load Maps
        if os.path.exists(MAPS_DIR):
            for filename in os.listdir(MAPS_DIR):
                if filename.endswith(".json"):
                    map_id = filename.replace(".json", "")
                    with open(os.path.join(MAPS_DIR, filename), 'r') as f:
                        self.maps_data[map_id] = json.load(f)

    def is_valid_move(self, zone_id, x, y):
        # Allow movement if map doesn't exist (fallback or testing)
        if zone_id not in self.maps_data:
            return True
            
        map_data = self.maps_data[zone_id]
        width = map_data["width"]
        height = map_data["height"]
        
        # Bounds check
        if x < 0 or x >= width or y < 0 or y >= height:
            return False
            
        # Collision check
        # layers["collision"] is a flat list
        idx = y * width + x
        collision_layer = map_data["layers"]["collision"]
        
        if 0 <= idx < len(collision_layer):
            return collision_layer[idx] == 0 # 0 is walkable
            
        return False

    def process(self, state: GameState, event: GameEvent) -> list[GameEvent]:
        # TODO: Intercept "MoveCommand" here? 
        # Actually PlayerMoved is an Event that happened.
        # Processors usually react to things that HAVE happened.
        # But if we want to BLOCK movement, we need to be in the Command Handler or 
        # the Event generation logic.
        # For now, let's assume the Frontend is the primary source of truth for "attempting" a move,
        # and we trust the Client mostly but verify here if we were generating state updates.
        # Since we receive PlayerMoved, it means it already "happened" in the client's eyes.
        # If we want to rollback, we'd emit a "TeleportPlayer" event back.
        # But for this scope, let's just stick to Encounter Logic
        
        if isinstance(event, PlayerMoved):
            # Optional: Verify validity and punish/rollback if invalid?
            # if not self.is_valid_move(event.zone_id, event.ex, event.ey): ...

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
            # Only in non-safe zones (Town is safe)
            # We can check map data danger level if we added it to JSON, 
            # or hardcode town check.
            if event.zone_id != 'town':
                import logging
                logger = logging.getLogger(__name__)
                combat_roll = random.randint(1, 100)
                logger.info(f"Exploration Roll: {combat_roll} (Threshold: 100)")
                
                if combat_roll <= 15: # 15% Chance
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
