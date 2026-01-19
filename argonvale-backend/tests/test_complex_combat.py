from pspf.events.combat import TurnSubmitted, CombatStarted
from pspf.processors.combat import CombatProcessor, CombatState

from app.schemas.items import WeaponStats

def test_complex_combat():
    processor = CombatProcessor()
    
    # Setup State
    # Attacker: Fire Sword (10 Fire, 3 Earth)
    # Defender: Reflect Shield (50% Fire Reflect, Block 5 Earth)
    
    state = CombatState(
        battle_id="battle-complex",
        attacker_id=1,
        defender_id=2,
        attacker_stats={"strength": 10}, # 1.0 Mult
        defender_stats={"defense": 10},  # 1.0 Mult
        
        attacker_weapon=WeaponStats(
            attack={"fire": 10, "earth": 3}
        ),
        defender_weapon=WeaponStats(
            reflection={"fire": 0.5},
            defense={"earth": 5}
        ),
        
        attacker_current_hp=100,
        defender_current_hp=100
    )
    
    event = TurnSubmitted(
        event_id="evt-complex-1",
        timestamp="2024-01-01T00:00:00",
        event_type="TurnSubmitted",
        battle_id="battle-complex",
        player_id=1, # Attacker attacks
        action="attack"
    )
    
    # Processing
    # 1. Incoming: Fire=10, Earth=3
    # 2. Reflect: Fire 50% -> 5 Reflected. 5 Remains. Earth 0% -> 3 Remains.
    # 3. Block: Fire 0 Blocked -> 5 Taken. Earth 5 Blocked -> 0 Taken.
    # Total Damage Dealt: 5
    # Total Reflected: 5
    
    results = processor.process(state, event)
    
    assert len(results) == 1
    res = results[0]
    
    print(f"Damage Dealt: {res.damage_dealt}")
    print(f"Damage Reflected: {res.damage_reflected}")
    
    assert res.damage_dealt == 5
    assert res.damage_reflected == 5
    assert res.defender_remaining_hp == 95
    assert res.attacker_remaining_hp == 95
    
    print("Complex Combat Test Passed")

if __name__ == "__main__":
    test_complex_combat()
