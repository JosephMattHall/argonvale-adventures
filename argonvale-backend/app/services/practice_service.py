import random
from sqlalchemy.orm import Session
from app.models.companion import Companion
from app.models.item import Item
import logging

logger = logging.getLogger(__name__)

def generate_practice_opponent(db: Session, user_companion: Companion):
    """
    Generates a mirrored opponent for practice mode.
    - Same stats as user_companion
    - Random mid-tier items (Uncommon/Rare)
    - Guaranteed 1 healing item
    """
    
    # 1. Clone Stats
    opponent_stats = {
        "enemy_name": f"Practice Bot ({user_companion.name})",
        "enemy_type": user_companion.element,
        "enemy_level": user_companion.level,
        "enemy_hp": user_companion.hp,
        "enemy_max_hp": user_companion.max_hp,
        "enemy_stats": {
            "str": user_companion.strength,
            "def": user_companion.defense,
            "spd": user_companion.speed
        },
        "enemy_image": user_companion.image_url,
    }

    # 2. Generate Random Loadout
    # Fetch eligible items (Uncommon/Rare weapons and armor)
    eligible_items = db.query(Item).filter(
        Item.is_template == True,
        Item.rarity.in_(["Uncommon", "Rare"]),
        Item.category.in_(["weapons", "armor", "utility"])
    ).all()
    
    # Fetch healing items (Potions)
    healing_items = db.query(Item).filter(
        Item.is_template == True,
        Item.category == "utility",
        Item.name.ilike("%potion%")
    ).all()
    
    selected_items = []
    
    # A. Mandatory Healing Item
    if healing_items:
        heal_item = random.choice(healing_items)
        selected_items.append({
            "id": -1, # Virtual ID
            "name": heal_item.name,
            "item_type": heal_item.item_type,
            "stats": heal_item.weapon_stats,
            "effect": heal_item.effect
        })
    
    # B. Random Gear (2-3 items)
    if eligible_items:
        num_items = random.randint(2, 3)
        for _ in range(num_items):
            item = random.choice(eligible_items)
            selected_items.append({
                "id": -random.randint(100, 999), # Virtual Negative ID
                "name": item.name,
                "item_type": item.item_type,
                "stats": item.weapon_stats,
                "effect": item.effect
            })
            
    # C. Ensure at least one weapon if not present
    has_weapon = any(i['item_type'] == 'weapon' for i in selected_items)
    if not has_weapon:
        weapons = [i for i in eligible_items if i.item_type == 'weapon']
        if weapons:
            w = random.choice(weapons)
            selected_items.append({
                "id": -random.randint(1000, 9999),
                "name": w.name,
                "item_type": w.item_type,
                "stats": w.weapon_stats,
                "effect": w.effect
            })

    # Add to context
    opponent_stats["enemy_items"] = selected_items
    
    # Compatibility with frontend which expects 'equipped_items' structure for enemies too often
    # But CombatProcessor expects 'enemy_weapons'/'enemy_items' in context for non-player entities usually.
    # We'll map it to standard context fields used in router.py for PvE
    
    return opponent_stats
