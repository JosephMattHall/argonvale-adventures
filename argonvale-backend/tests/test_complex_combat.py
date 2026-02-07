from pspf.events.combat import CombatAction, CombatStarted, TurnProcessed
from pspf.processors.combat import CombatProcessor

def test_complex_combat():
    processor = CombatProcessor()
    
    # Setup State
    # Attacker: Fire Sword (10 Fire)
    # Defender: Wind Armor (Weak to Fire), Reflect Shield (100% chance to reflect)
    
    context = {
        "enemy_hp": 100,
        "enemy_max_hp": 100,
        "enemy_stats": {"def": 0},
        "enemy_type": "Wind", # Weak to Fire (1.25x dmg)
        "player_hp": 100,
        "player_max_hp": 100,
        "player_stats": {"str": 10}, 
        "equipped_items": [
            {"id": 101, "name": "Fire Sword", "item_type": "weapon", "stats": {"atk": {"Fire": 10}}} 
        ],
        "enemy_items": [
            {"id": 201, "name": "Reflect Shield", "item_type": "shield", "stats": {"def": 0}, "effect": {"type": "reflect", "chance": 1.0}}
        ]
    }
    
    # Initialize Session
    # Attacker ID 1 (Player) vs ID 2 (Enemy/AI Context)
    # Note: In PVE, Defender is AI (ID 0 usually in events, but session tracks it).
    
    start_event = CombatStarted.create(
        combat_id="battle-complex",
        attacker_id=1,
        attacker_companion_id=1,
        mode="pve",
        context=context
    )
    
    processor.process(None, start_event)
    
    # Action: Attack
    action_event = CombatAction.create(
        combat_id="battle-complex",
        actor_id=1,
        action_type="attack",
        item_ids=[101] # Fire Sword
    )
    
    results = processor.process(None, action_event)
    
    assert len(results) >= 1
    # We expect TurnProcessed for player, and maybe TurnProcessed for AI (if it survives and acts)
    
    player_turn = results[0]
    assert isinstance(player_turn, TurnProcessed)
    assert player_turn.actor_id == 1
    
    # Check Elemental Advantage
    # Base Atk = 10 (Str) + 10 (Weapon) = 20
    # Fire Element vs Wind Enemy -> 1.25x Multiplier for the Fire portion?
    # Logic: 
    # atk_icons_dict = {"Phys": 10, "Fire": 10}
    # Phys vs Wind -> 1.0
    # Fire vs Wind -> 1.25
    # Total Dmg roughly = (10 * 1.0 + 10 * 1.25) = 22.5
    # Variance 0.9-1.1 -> 20.25 - 24.75
    # Mitigation: 20 / (20 + 0) = 1.0
    
    # Check Reflection
    # Logic: reflected_dmg = int(sum(atk_icons_dict.values()) * 0.5) = int(20 * 0.5) = 10
    # Player takes 10 damage.
    
    print(f"Log: {player_turn.description}")
    print(f"Dmg Dealt: {player_turn.damage_dealt}")
    print(f"Attacker HP (remaining): {player_turn.attacker_hp}")
    
    assert player_turn.damage_dealt >= 1
    
    # Verify Reflection happened
    assert "REFLECTED" in player_turn.description
    assert player_turn.attacker_hp <= 90 # Took at least 10 damage
    
    print("Complex Combat Test Passed")

if __name__ == "__main__":
    test_complex_combat()
