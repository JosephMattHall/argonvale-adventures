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
        print("Migrating 'items' table...")
        # Add trade_lot_id to items
        cursor.execute("ALTER TABLE items ADD COLUMN trade_lot_id INTEGER REFERENCES trade_lots(id)")
        print("Column 'trade_lot_id' added to 'items' table.")
    except sqlite3.OperationalError as e:
        print(f"Items migration skipped/partial: {e}")

    try:
        print("Recreating 'trade_lots' table...")
        cursor.execute("DROP TABLE IF EXISTS trade_lots")
        cursor.execute("""
            CREATE TABLE trade_lots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                description VARCHAR DEFAULT '',
                status VARCHAR DEFAULT 'active',
                coins INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("'trade_lots' table recreated successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error recreating 'trade_lots': {e}")

    try:
        print("Recreating 'trade_offers' table...")
        cursor.execute("DROP TABLE IF EXISTS trade_offers")
        cursor.execute("""
            CREATE TABLE trade_offers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lot_id INTEGER REFERENCES trade_lots(id),
                offerer_id INTEGER REFERENCES users(id),
                offered_coins INTEGER DEFAULT 0,
                offered_items JSON DEFAULT '[]',
                status VARCHAR DEFAULT 'pending',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("'trade_offers' table recreated successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error recreating 'trade_offers': {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
