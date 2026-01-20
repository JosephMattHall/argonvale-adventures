import sqlite3
import os

# Database path
DB_PATH = "/home/x/projects/argonvale-adventures/argonvale-backend/argonvale.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Adding 'last_move_at' column to 'users' table...")
        cursor.execute("ALTER TABLE users ADD COLUMN last_move_at FLOAT DEFAULT 0.0")
        conn.commit()
        print("Migration successful: Added 'last_move_at' to 'users'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Migration skipped: 'last_move_at' already exists.")
        else:
            print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
