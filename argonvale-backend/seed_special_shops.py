from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.item import Item

def seed_shops():
    db = SessionLocal()
    try:
        # Clear existing shop items (System items have owner_id = None)
        db.query(Item).filter(Item.owner_id == None).delete()
        
        shop_items = [
            # --- Weapons Shop ---
            Item(
                name="Dragonbone Blade",
                item_type="weapon",
                category="weapons",
                description="A heavy blade carved from dragon bone. High attack power.",
                image_url="dragonbone_blade.png",
                weapon_stats={"attack": {"physical": 25, "fire": 10}},
                price=500,
                owner_id=None
            ),
            Item(
                name="Frostbite Scimitar",
                item_type="weapon",
                category="weapons",
                description="Cold to the touch. Has a 25% chance to freeze opponents.",
                image_url="frostbite_scimitar.png",
                weapon_stats={"attack": {"physical": 15, "ice": 5}},
                effect={"type": "freeze", "chance": 0.25, "duration": 1},
                price=650,
                owner_id=None
            ),
            Item(
                name="Twin Daggers",
                item_type="weapon",
                category="weapons",
                description="Light and fast. Provides a speed boost.",
                image_url="twin_daggers.png",
                weapon_stats={"attack": {"physical": 10}, "speed": 10},
                price=300,
                owner_id=None
            ),
            
            # --- Armor Shop ---
            Item(
                name="Guardian Buckler",
                item_type="armor",
                category="armor",
                description="A sturdy shield that reflects 20% of magic damage.",
                image_url="guardian_buckler.png",
                weapon_stats={"defense": {"physical": 15}, "reflection": {"magic": 0.2}},
                price=400,
                owner_id=None
            ),
            Item(
                name="Potion of Invisibility",
                item_type="potion",
                category="armor",
                description="Become nearly unseen. 100% chance to take no damage for one turn.",
                image_url="invisibility_potion.png",
                effect={"type": "stealth", "chance": 1.0, "duration": 1},
                price=250,
                is_consumable=True,
                owner_id=None
            ),
            Item(
                name="Mirage Cloak",
                item_type="armor",
                category="armor",
                description="Woven with dream thread. Gives a 30% chance to dodge attacks.",
                image_url="mirage_cloak.png",
                effect={"type": "stealth", "chance": 0.3, "duration": 1},
                price=800,
                owner_id=None
            ),
            
            # --- Food Stalls ---
            Item(
                name="Meaty Bone",
                item_type="food",
                category="food",
                description="A hearty treat. Restores 30 hunger.",
                image_url="meaty_bone.png",
                effect={"type": "hunger", "value": 30},
                price=25,
                is_consumable=True,
                owner_id=None
            ),
            Item(
                name="Wild Berries",
                item_type="food",
                category="food",
                description="Sweet and nutritious. Restores 10 hunger.",
                image_url="wild_berries.png",
                effect={"type": "hunger", "value": 10},
                price=10,
                is_consumable=True,
                owner_id=None
            ),
            Item(
                name="Ancient Elixir",
                item_type="food",
                category="food",
                description="Restore full hunger and some HP.",
                image_url="ancient_elixir.png",
                effect={"type": "hunger", "value": 100, "heal": 20},
                price=150,
                is_consumable=True,
                owner_id=None
            ),
        ]
        
        db.add_all(shop_items)
        db.commit()
        print(f"Successfully seeded {len(shop_items)} categorized items.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding shops: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_shops()
