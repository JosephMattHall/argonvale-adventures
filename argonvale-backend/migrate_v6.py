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
        # Add current_combat_id to companions
        cursor.execute("ALTER TABLE companions ADD COLUMN current_combat_id TEXT")
    except sqlite3.OperationalError as e:
        print(f"Companions migration skipped/partial: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
