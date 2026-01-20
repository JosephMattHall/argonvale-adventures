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
        print("Migrating 'users' for OAuth support...")
        # Add google_id to users
        # Note: SQLite doesn't directly support ALTER TABLE for making columns nullable if they already are, 
        # but by default columns are nullable unless specified otherwise. 
        # We just need to add the column.
        cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
        # Create an index for google_id
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)")
        print("Updated users table with google_id column.")
    except sqlite3.OperationalError as e:
        print(f"Users migration skipped/partial: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
