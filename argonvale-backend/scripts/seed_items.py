import sys
import os
import random
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.item import Item

def generate_weapons():
    tiers = [
        {"name": "Low", "range": (5, 12), "price_range": (50, 200), "count": 40},
        {"name": "Mid", "range": (13, 28), "price_range": (300, 800), "count": 40},
        {"name": "High", "range": (30, 60), "price_range": (1000, 3000), "count": 20},
    ]
    
    prefixes = ["Rusty", "Shiny", "Dull", "Ancient", "Heroic", "Dark", "Holy", "Frozen", "Burning", "Sturdy", "Swift", "Cursed", "Blessed", "Ethereal", "Grim", "Radiant"]
    types = ["Sword", "Axe", "Bow", "Staff", "Dagger", "Spear", "Mace", "Scythe", "Blade", "Shield", "Hammer"]
    elements = ["Phys", "Fire", "Water", "Wind", "Earth", "Light", "Shadow"]
    
    weapons = []
    
    for tier in tiers:
        for i in range(tier["count"]):
            prefix = random.choice(prefixes)
            w_type = random.choice(types)
            name = f"{prefix} {w_type}"
            
            # Icons
            total_icons = random.randint(*tier["range"])
            icon_dict = {}
            
            # Distribute icons
            remaining = total_icons
            # Primary element
            primary = random.choice(elements)
            p_val = int(remaining * random.uniform(0.6, 0.9))
            icon_dict[primary] = p_val
            remaining -= p_val
            
            # Secondary element (if any icons left)
            if remaining > 0:
                secondary = random.choice([e for e in elements if e != primary])
                icon_dict[secondary] = remaining
            
            # Split between Atk and Def icons
            # Weapons are mostly Atk
            atk_pct = random.uniform(0.7, 1.0)
            atk_dict = {k: int(v * atk_pct) for k, v in icon_dict.items() if int(v * atk_pct) > 0}
            def_dict = {k: v - atk_dict.get(k, 0) for k, v in icon_dict.items() if v - atk_dict.get(k, 0) > 0}
            
            # Special effects (rare)
            effect = {}
            if tier["name"] == "High" or random.random() < 0.1:
                if primary in ["Water", "Light"]:
                    effect = {"type": "freeze", "chance": 0.1, "duration": 1}
                elif primary in ["Shadow", "Wind"]:
                    effect = {"type": "stealth", "chance": 0.1, "duration": 1}
            
            weapons.append({
                "name": name,
                "item_type": "weapon",
                "stats": {"atk": atk_dict, "def": def_dict},
                "effect": effect,
                "price": random.randint(*tier["price_range"])
            })
            
    # 20 Very Rare (Relic) Weapons
    relic_names = [
        "Excalibur", "Gungnir", "Mjolnir", "Aegis", "Masamune", "Muramasa", "Areadbhar", "Failnaught",
        "Luin", "Durandal", "Gram", "Tyrfing", "Hrunting", "Naegling", "Gae Bolg", "Joyieuse",
        "Clarent", "Ascalon", "Dainsleif", "Mistilteinn"
    ]
    
    for r_name in relic_names:
        # Relics are Tier 4
        primary = random.choice(elements)
        secondary = random.choice([e for e in elements if e != primary])
        
        weapons.append({
            "name": f"Relic: {r_name}",
            "item_type": "weapon",
            "stats": {
                "atk": {primary: random.randint(35, 50), secondary: random.randint(15, 25)},
                "def": {primary: random.randint(10, 20)}
            },
            "effect": {"type": "freeze" if random.random() < 0.5 else "stealth", "chance": 0.2, "duration": 2},
            "price": 5000
        })
        
    return weapons

def seed_items():
    db: Session = SessionLocal()
    try:
        # Clear existing system items
        db.query(Item).filter(Item.owner_id == None).delete()
        db.commit()

        items_data = []
        
        # 1. Weapons (100 + 20 Rare)
        items_data.extend(generate_weapons())
        
        # 2. Potions
        hp_vals = [10, 20, 40, 80, 100, 150, 200, 300]
        for val in hp_vals:
            items_data.append({
                "name": f"Health Potion ({val} HP)",
                "item_type": "potion",
                "stats": {"heal": val},
                "price": int(val * 0.8)
            })
        items_data.append({
            "name": "Full Elixir",
            "item_type": "potion",
            "stats": {"heal_pct": 100},
            "price": 1000
        })
        
        # 3. Status Items
        chances = [25, 50, 100]
        for c in chances:
            items_data.append({
                "name": f"Freeze Crystal ({c}%)",
                "item_type": "utility",
                "effect": {"type": "freeze", "chance": c/100, "duration": 1},
                "price": int(c * 2)
            })
            items_data.append({
                "name": f"Invisibility Cloak ({c}%)",
                "item_type": "utility",
                "effect": {"type": "stealth", "chance": c/100, "duration": 1},
                "price": int(c * 2)
            })
            
        # 4. Food Items
        foods = ["Apple", "Bread", "Steak", "Muffin", "Cheese", "Berry", "Soup", "Salmon", "Chocolate", "Honey"]
        for f in foods:
            items_data.append({
                "name": f,
                "item_type": "food",
                "stats": {"heal": random.randint(10, 25)},
                "price": 15
            })

        # Add to DB
        count = 0
        for data in items_data:
            new_item = Item(
                name=data["name"],
                item_type=data.get("item_type", "misc"),
                weapon_stats=data.get("stats", {}),
                effect=data.get("effect", {}),
                price=data.get("price", 0),
                owner_id=None,
                is_equipped=False
            )
            db.add(new_item)
            count += 1
        
        db.commit()
        print(f"Successfully seeded {count} items.")

    except Exception as e:
        print(f"Error seeding items: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_items()
