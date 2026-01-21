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
        print("Migrating 'items' table...")
        # Add rarity, stock, is_template to items
        cursor.execute("ALTER TABLE items ADD COLUMN rarity TEXT DEFAULT 'Common'")
        cursor.execute("ALTER TABLE items ADD COLUMN stock INTEGER DEFAULT 1")
        cursor.execute("ALTER TABLE items ADD COLUMN is_template BOOLEAN DEFAULT 0")
        print("Columns added successfully.")
    except sqlite3.OperationalError as e:
        print(f"Migration skipped/partial: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
