import sys
import os
import random

# Add project root to path
sys.path.append(os.getcwd())

from pspf.processors.exploration import ExplorationProcessor
from pspf.events.movement import PlayerMoved

# Mock State
class MockState:
    pass

def test_encounters():
    processor = ExplorationProcessor()
    
    print(f"Creatures Data Keys: {processor.creatures_data.keys()}")
    print(f"Common Creatures Count: {len(processor.creatures_data.get('common_creatures', []))}")
    
    # Simulate 100 steps in 'wild'
    encounters = 0
    loots = 0
    
    for i in range(100):
        evt = PlayerMoved.create(player_id=1, zone_id='wild', x=10, y=10)
        results = processor.process(MockState(), evt)
        
        for res in results:
            if res.__class__.__name__ == 'CombatStarted':
                encounters += 1
            if res.__class__.__name__ == 'LootFound':
                loots += 1
                
    print(f"Steps: 100")
    print(f"Encounters: {encounters}")
    print(f"Loot: {loots}")

if __name__ == "__main__":
    test_encounters()
