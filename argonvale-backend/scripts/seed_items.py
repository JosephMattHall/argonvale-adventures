import sys
import os
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.item import Item
from app.models.user import User

def seed_items():
    db: Session = SessionLocal()
    try:
        # 1. Clear existing system items to avoid duplicates/mess
        db.query(Item).filter(Item.owner_id == None).delete()
        db.commit()

        items_data = [
            # --- Tier 1: Recruits (Max 8 Icons) | Price: 50-150 ---
            {"name": "Novice's Dirk", "item_type": "weapon", "stats": {"atk": {"phys": 8}}, "price": 50},
            {"name": "Buckler", "item_type": "armor", "stats": {"def": {"phys": 8}}, "price": 60},
            {"name": "Spark Staff", "item_type": "weapon", "stats": {"atk": {"fire": 6, "light": 2}}, "price": 120},
            {"name": "Tattered Cloak", "item_type": "armor", "stats": {"def": {"wind": 4, "shadow": 4}}, "price": 80},
            {"name": "Training Sword", "item_type": "weapon", "stats": {"atk": {"phys": 7, "wind": 1}}, "price": 75},
            {"name": "Stone Shield", "item_type": "armor", "stats": {"def": {"earth": 8}}, "price": 95},
            {"name": "Water Vial", "item_type": "weapon", "stats": {"atk": {"water": 6}, "def": {"water": 2}}, "price": 110},
            {"name": "Apprentice Robe", "item_type": "armor", "stats": {"def": {"fire": 4, "water": 4}}, "price": 130},
            {"name": "Iron Mace", "item_type": "weapon", "stats": {"atk": {"phys": 8}}, "price": 100},
            {"name": "Chainmail Scrap", "item_type": "armor", "stats": {"def": {"phys": 6, "earth": 2}}, "price": 140},
            {"name": "Glowstone", "item_type": "weapon", "stats": {"atk": {"light": 8}}, "price": 150},
            {"name": "Dusk Blade", "item_type": "weapon", "stats": {"atk": {"shadow": 6, "phys": 2}}, "price": 145},
            {"name": "Simple Bow", "item_type": "weapon", "stats": {"atk": {"wind": 8}}, "price": 90},
            {"name": "Leather Boots", "item_type": "armor", "stats": {"def": {"phys": 4, "earth": 4}}, "price": 70},
            {"name": "Rusty Scythe", "item_type": "weapon", "stats": {"atk": {"shadow": 5, "phys": 3}}, "price": 115},

            # --- Tier 2: Veterans (Max 12 Spec / 15 Dual) | Price: 300-600 ---
            {"name": "Soldier's Blade", "item_type": "weapon", "stats": {"atk": {"phys": 12}}, "price": 300},
            {"name": "Knight's Kite", "item_type": "armor", "stats": {"def": {"phys": 12}}, "price": 320},
            {"name": "Inferno Pillar", "item_type": "weapon", "stats": {"atk": {"fire": 12}}, "price": 450},
            {"name": "Ocean Guard", "item_type": "armor", "stats": {"def": {"water": 12}}, "price": 400},
            {"name": "Glaive of Balance", "item_type": "weapon", "stats": {"atk": {"phys": 8}, "def": {"phys": 7}}, "price": 500},
            {"name": "Stormcaller Bow", "item_type": "weapon", "stats": {"atk": {"wind": 12}}, "price": 480},
            {"name": "Titan's Plate", "item_type": "armor", "stats": {"def": {"earth": 12}}, "price": 550},
            {"name": "Sunlight Spear", "item_type": "weapon", "stats": {"atk": {"light": 10}, "def": {"light": 5}}, "price": 580},
            {"name": "Shadow Silk", "item_type": "armor", "stats": {"def": {"shadow": 12}}, "price": 420},
            {"name": "Executioner's Axe", "item_type": "weapon", "stats": {"atk": {"shadow": 12}}, "price": 520},
            {"name": "Defender's Halberd", "item_type": "weapon", "stats": {"atk": {"phys": 7}, "def": {"phys": 8}}, "price": 490},
            {"name": "Crystal Scepter", "item_type": "weapon", "stats": {"atk": {"light": 12}}, "price": 530},
            {"name": "Earthen Bulwark", "item_type": "armor", "stats": {"def": {"earth": 10, "phys": 5}}, "price": 510},
            {"name": "Corsair's Cutlass", "item_type": "weapon", "stats": {"atk": {"phys": 11, "water": 4}}, "price": 470},
            {"name": "Midnight Shield", "item_type": "armor", "stats": {"def": {"shadow": 9}, "atk": {"shadow": 6}}, "price": 560},

            # --- Tier 3: Champions (Max 18 Spec / 21 Mixed) | Price: 1000-2500 ---
            {"name": "DragonSlayer", "item_type": "weapon", "stats": {"atk": {"phys": 18}}, "price": 1500},
            {"name": "Aegis of Radiance", "item_type": "armor", "stats": {"def": {"light": 10, "phys": 8}}, "price": 1800},
            {"name": "Void Reaver", "item_type": "weapon", "stats": {"atk": {"shadow": 18}}, "price": 2000},
            {"name": "Elder Oak Staff", "item_type": "weapon", "stats": {"atk": {"earth": 15, "light": 3}}, "price": 1200},
            {"name": "Guardian's Pike", "item_type": "weapon", "stats": {"atk": {"phys": 13}, "def": {"phys": 8}}, "price": 1400},
            {"name": "Celestial Plate", "item_type": "armor", "stats": {"def": {"light": 12, "phys": 9}}, "price": 2200},
            {"name": "Maelstrom Trifecta", "item_type": "weapon", "stats": {"atk": {"fire": 6, "water": 6, "wind": 6}}, "price": 2500},
            {"name": "Shadow Guard", "item_type": "armor", "stats": {"def": {"shadow": 11, "phys": 10}}, "price": 1900},
            {"name": "Bow of the North Star", "item_type": "weapon", "stats": {"atk": {"wind": 18}}, "price": 1700},
            {"name": "Volcanic Aegis", "item_type": "armor", "stats": {"def": {"fire": 10, "phys": 11}}, "price": 2100},
            {"name": "Blade of Eternity", "item_type": "weapon", "stats": {"atk": {"light": 18}}, "price": 1600},
            {"name": "Stonewall Greatshield", "item_type": "armor", "stats": {"def": {"earth": 18}}, "price": 2300},
            {"name": "Chaos Vanguard", "item_type": "weapon", "stats": {"atk": {"phys": 13}, "def": {"shadow": 8}}, "price": 1550},
            {"name": "Neptune's Trident", "item_type": "weapon", "stats": {"atk": {"water": 18}}, "price": 1650},
            {"name": "Aura of Wisdom", "item_type": "armor", "stats": {"def": {"wind": 10, "light": 11}}, "price": 1750},

            # --- Consumables: Healing ---
            {"name": "Minor Health Potion", "item_type": "potion", "stats": {"heal": 10}, "price": 10},
            {"name": "Lesser Health Potion", "item_type": "potion", "stats": {"heal": 20}, "price": 18},
            {"name": "Health Potion", "item_type": "potion", "stats": {"heal": 50}, "price": 45},
            {"name": "Greater Health Potion", "item_type": "potion", "stats": {"heal": 100}, "price": 85},
            {"name": "Expert Health Potion", "item_type": "potion", "stats": {"heal": 150}, "price": 125},
            {"name": "Master Health Potion", "item_type": "potion", "stats": {"heal": 200}, "price": 160},
            {"name": "Grand Health Potion", "item_type": "potion", "stats": {"heal": 300}, "price": 240},
            {"name": "Half-Elixir", "item_type": "potion", "stats": {"heal_pct": 50}, "price": 500},
            {"name": "Full-Elixir", "item_type": "potion", "stats": {"heal_pct": 100}, "price": 1200},
        ]

        for item_data in items_data:
            new_item = Item(
                name=item_data["name"],
                item_type=item_data["item_type"],
                weapon_stats=item_data["stats"],
                price=item_data["price"],
                owner_id=None, # System Template
                is_equipped=False
            )
            db.add(new_item)
        
        db.commit()
        print(f"Successfully seeded {len(items_data)} items as system templates for the shop.")

    except Exception as e:
        print(f"Error seeding items: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_items()
