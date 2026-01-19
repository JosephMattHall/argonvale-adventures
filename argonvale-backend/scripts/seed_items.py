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
        # Get the first user to assign items to (for testing)
        user = db.query(User).first()
        if not user:
            print("No user found. Please register a user first.")
            return

        items_data = [
            # --- Tier 1: Recruits (Max 8 Icons) ---
            {"name": "Novice's Dirk", "item_type": "weapon", "stats": {"atk": {"phys": 8}}},
            {"name": "Buckler", "item_type": "armor", "stats": {"def": {"phys": 8}}},
            {"name": "Spark Staff", "item_type": "weapon", "stats": {"atk": {"fire": 6, "light": 2}}},
            {"name": "Tattered Cloak", "item_type": "armor", "stats": {"def": {"wind": 4, "shadow": 4}}},
            {"name": "Training Sword", "item_type": "weapon", "stats": {"atk": {"phys": 7, "wind": 1}}},
            {"name": "Stone Shield", "item_type": "armor", "stats": {"def": {"earth": 8}}},
            {"name": "Water Vial", "item_type": "weapon", "stats": {"atk": {"water": 6}, "def": {"water": 2}}},
            {"name": "Apprentice Robe", "item_type": "armor", "stats": {"def": {"fire": 4, "water": 4}}},
            {"name": "Iron Mace", "item_type": "weapon", "stats": {"atk": {"phys": 8}}},
            {"name": "Chainmail Scrap", "item_type": "armor", "stats": {"def": {"phys": 6, "earth": 2}}},
            {"name": "Glowstone", "item_type": "weapon", "stats": {"atk": {"light": 8}}},
            {"name": "Dusk Blade", "item_type": "weapon", "stats": {"atk": {"shadow": 6, "phys": 2}}},
            {"name": "Simple Bow", "item_type": "weapon", "stats": {"atk": {"wind": 8}}},
            {"name": "Leather Boots", "item_type": "armor", "stats": {"def": {"phys": 4, "earth": 4}}},
            {"name": "Rusty Scythe", "item_type": "weapon", "stats": {"atk": {"shadow": 5, "phys": 3}}},

            # --- Tier 2: Veterans (Max 12 Spec / 15 Dual) ---
            {"name": "Soldier's Blade", "item_type": "weapon", "stats": {"atk": {"phys": 12}}},
            {"name": "Knight's Kite", "item_type": "armor", "stats": {"def": {"phys": 12}}},
            {"name": "Inferno Pillar", "item_type": "weapon", "stats": {"atk": {"fire": 12}}},
            {"name": "Ocean Guard", "item_type": "armor", "stats": {"def": {"water": 12}}},
            {"name": "Glaive of Balance", "item_type": "weapon", "stats": {"atk": {"phys": 8}, "def": {"phys": 7}}},
            {"name": "Stormcaller Bow", "item_type": "weapon", "stats": {"atk": {"wind": 12}}},
            {"name": "Titan's Plate", "item_type": "armor", "stats": {"def": {"earth": 12}}},
            {"name": "Sunlight Spear", "item_type": "weapon", "stats": {"atk": {"light": 10}, "def": {"light": 5}}},
            {"name": "Shadow Silk", "item_type": "armor", "stats": {"def": {"shadow": 12}}},
            {"name": "Executioner's Axe", "item_type": "weapon", "stats": {"atk": {"shadow": 12}}},
            {"name": "Defender's Halberd", "item_type": "weapon", "stats": {"atk": {"phys": 7}, "def": {"phys": 8}}},
            {"name": "Crystal Scepter", "item_type": "weapon", "stats": {"atk": {"light": 12}}},
            {"name": "Earthen Bulwark", "item_type": "armor", "stats": {"def": {"earth": 10, "phys": 5}}},
            {"name": "Corsair's Cutlass", "item_type": "weapon", "stats": {"atk": {"phys": 11, "water": 4}}},
            {"name": "Midnight Shield", "item_type": "armor", "stats": {"def": {"shadow": 9}, "atk": {"shadow": 6}}},

            # --- Tier 3: Champions (Max 18 Spec / 21 Mixed with 8+ Def) ---
            {"name": "DragonSlayer", "item_type": "weapon", "stats": {"atk": {"phys": 18}}},
            {"name": "Aegis of Radiance", "item_type": "armor", "stats": {"def": {"light": 10, "phys": 8}}},
            {"name": "Void Reaver", "item_type": "weapon", "stats": {"atk": {"shadow": 18}}},
            {"name": "Elder Oak Staff", "item_type": "weapon", "stats": {"atk": {"earth": 15, "light": 3}}},
            {"name": "Guardian's Pike", "item_type": "weapon", "stats": {"atk": {"phys": 13}, "def": {"phys": 8}}},
            {"name": "Celestial Plate", "item_type": "armor", "stats": {"def": {"light": 12, "phys": 9}}},
            {"name": "Maelstrom Trifecta", "item_type": "weapon", "stats": {"atk": {"fire": 6, "water": 6, "wind": 6}}},
            {"name": "Shadow Guard", "item_type": "armor", "stats": {"def": {"shadow": 11, "phys": 10}}},
            {"name": "Bow of the North Star", "item_type": "weapon", "stats": {"atk": {"wind": 18}}},
            {"name": "Volcanic Aegis", "item_type": "armor", "stats": {"def": {"fire": 10, "phys": 11}}},
            {"name": "Blade of Eternity", "item_type": "weapon", "stats": {"atk": {"light": 18}}},
            {"name": "Stonewall Greatshield", "item_type": "armor", "stats": {"def": {"earth": 18}}},
            {"name": "Chaos Vanguard", "item_type": "weapon", "stats": {"atk": {"phys": 13}, "def": {"shadow": 8}}},
            {"name": "Neptune's Trident", "item_type": "weapon", "stats": {"atk": {"water": 18}}},
            {"name": "Aura of Wisdom", "item_type": "armor", "stats": {"def": {"wind": 10, "light": 11}}},
        ]

        for item_data in items_data:
            # Check if item already exists to avoid duplicates
            existing = db.query(Item).filter(Item.name == item_data["name"], Item.owner_id == user.id).first()
            if not existing:
                new_item = Item(
                    name=item_data["name"],
                    item_type=item_data["item_type"],
                    weapon_stats=item_data["stats"],
                    owner_id=user.id,
                    is_equipped=False
                )
                db.add(new_item)
        
        db.commit()
        print(f"Successfully seeded {len(items_data)} items for user {user.username}")

    except Exception as e:
        print(f"Error seeding items: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_items()
