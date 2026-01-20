import sqlite3
import os

DB_PATH = "/home/x/projects/argonvale-adventures/argonvale-backend/argonvale.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Migrating 'companions'...")
        # Add hunger and last_fed_at to companions
        cursor.execute("ALTER TABLE companions ADD COLUMN hunger INTEGER DEFAULT 100")
        cursor.execute("ALTER TABLE companions ADD COLUMN last_fed_at DATETIME DEFAULT CURRENT_TIMESTAMP")
    except sqlite3.OperationalError as e:
        print(f"Companions migration skipped/partial: {e}")

    try:
        print("Migrating 'items'...")
        # Add expanded fields to items
        cursor.execute("ALTER TABLE items ADD COLUMN description TEXT DEFAULT ''")
        cursor.execute("ALTER TABLE items ADD COLUMN image_url TEXT DEFAULT 'default_item.png'")
        cursor.execute("ALTER TABLE items ADD COLUMN category TEXT DEFAULT 'misc'")
        cursor.execute("ALTER TABLE items ADD COLUMN effect TEXT DEFAULT '{}'") # JSON as text
        cursor.execute("ALTER TABLE items ADD COLUMN is_consumable BOOLEAN DEFAULT 0")
        
        # update item_type comment-like guidance if needed? No, just add columns.
    except sqlite3.OperationalError as e:
        print(f"Items migration skipped/partial: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
