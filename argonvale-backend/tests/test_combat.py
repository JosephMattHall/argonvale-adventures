from pspf.events.combat import TurnSubmitted, CombatStarted
from pspf.processors.combat import CombatProcessor, CombatState

def test_combat_determinism():
    processor = CombatProcessor()
    
    # State needs to be populated as if CombatStarted happened
    state = CombatState(
        battle_id="battle-1",
        attacker_stats={"id": 1, "strength": 20}, # Strength 20 -> 2.0 multiplier
        defender_stats={"id": 2, "defense": 10}, # Defense 10 -> 1.0 multiplier
        attacker_weapon={"power": 5, "icons": ["fire", "fire"]}, # 2 icons -> 20 base. 5 power.
        defender_weapon={},
        attacker_current_hp=100,
        defender_current_hp=100
    )
    
    # Formula:
    # Base Icon Power = 2 * 10 = 20
    # Weapon Power = 5
    # Str Mult = 20 / 10 = 2.0
    # Def Mult = 10 / 10 = 1.0
    # Damage = (20 * 5 * 2.0 * 1.0) / 1.0 = 200
    
    event = TurnSubmitted(
        event_id="evt-1",
        timestamp="2024-01-01T00:00:00",
        event_type="TurnSubmitted",
        battle_id="battle-1",
        player_id=1,
        action="attack"
    )
    
    # Run 1
    results1 = processor.process(state, event)
    
    # Run 2
    results2 = processor.process(state, event)
    
    # Assert
    assert len(results1) == 1
    result_event = results1[0]
    
    print(f"Calculated Damage: {result_event.damage}")
    assert result_event.damage == 200
    assert result_event.remaining_hp == 100 - 200 # -100
    
    assert results1[0].damage == results2[0].damage
    
    print("Combat Determinism & Logic Test Passed")

if __name__ == "__main__":
    test_combat_determinism()
