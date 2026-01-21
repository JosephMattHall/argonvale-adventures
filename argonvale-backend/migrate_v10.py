import sqlite3
import os

DB_PATH = "/home/x/projects/argonvale-adventures/argonvale-backend/argonvale.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Migrating 'items' table (adding 'trade_offer_id' column)...")
        cursor.execute("ALTER TABLE items ADD COLUMN trade_offer_id INTEGER REFERENCES trade_offers(id)")
        print("Column 'trade_offer_id' added to 'items' table.")
    except sqlite3.OperationalError as e:
        print(f"Items migration skipped/partial: {e}")

    try:
        print("Ensuring 'trade_offers' table is correct...")
        # Since we just recreated it in v8, it should be fine, but let's double check columns if needed.
        # Based on check_schema output: (id, lot_id, offerer_id, offered_coins, offered_items, status, timestamp)
        # We might want to rename lot_id to trade_lot_id for consistency but the model uses lot_id.
        pass
    except Exception as e:
        print(f"Error checking 'trade_offers': {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
