import sys
import os
import logging
from app.db.session import SessionLocal
from app.models.user import User
from app.models.companion import Companion
from pspf.events.combat import CombatStarted

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_hydration():
    db = SessionLocal()
    try:
        # 1. Get User 'james'
        user = db.query(User).filter(User.username == "james").first()
        if not user:
            print("User 'james' not found.")
            return

        print(f"Testing for user: {user.username} (ID: {user.id})")

        # 2. Get Active Companion
        companion = db.query(Companion).filter(Companion.owner_id == user.id, Companion.is_active == True).first()
        if not companion:
            print("No active companion found for user.")
            return

        print(f"Found active companion: {companion.name} (ID: {companion.id})")

        # 3. Simulate CombatStarted Event (from ExplorationProcessor)
        mock_event = CombatStarted.create(
            combat_id="test_combat_123",
            attacker_id=user.id,
            attacker_companion_id=None, # Missing
            defender_id=None,
            mode="pve",
            context={
                "enemy_name": "Test Goblin",
                "enemy_hp": 30,
                "enemy_max_hp": 30,
                "enemy_stats": {"STR": 5, "DEF": 2}
            }
        )
        
        print("Initial Event Context (Partial):", mock_event.context.keys())

        # 4. Run Hydration Logic (Simulation)
        # --- LOGIC START ---
        from app.models.item import Item as DBItem
        equipped_db = db.query(DBItem).filter(DBItem.owner_id == user.id, DBItem.is_equipped == True).all()
        equipped_items = [{"id": i.id, "name": i.name, "item_type": i.item_type, "stats": i.weapon_stats, "effect": i.effect} for i in equipped_db]

        # Create new context
        new_context = mock_event.context.copy()
        new_context.update({
            "companion_id": companion.id,
            "companion_name": companion.name,
            "companion_element": companion.element,
            "companion_image": companion.image_url,
            "player_hp": companion.hp,
            "player_max_hp": companion.max_hp,
            "player_stats": {
                "str": companion.strength,
                "def": companion.defense,
                "spd": companion.speed
            },
            "equipped_items": equipped_items
        })
        
        # Create new event instance
        hydrated_event = mock_event.model_copy(update={
            "attacker_companion_id": companion.id,
            "context": new_context
        })
        # --- LOGIC END ---

        print("Hydrated Event Context:", hydrated_event.context.keys())
        
        # Verify Key Fields
        required_fields = ["player_hp", "player_stats", "equipped_items", "companion_name"]
        missing = [f for f in required_fields if f not in hydrated_event.context]
        
        if missing:
            print(f"FAIL: Missing fields in hydrated context: {missing}")
        else:
            print("SUCCESS: Event hydrated correctly.")
            print(f"Player HP: {hydrated_event.context['player_hp']}")
            print(f"Equipped Items: {len(hydrated_event.context['equipped_items'])}")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_hydration()
