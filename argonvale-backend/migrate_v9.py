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
        print("Migrating 'trade_lots' table (removing 'coins' column)...")
        # SQLite doesn't support DROP COLUMN easily in older versions, 
        # so we recreate the table.
        
        # 1. Rename existing table
        cursor.execute("ALTER TABLE trade_lots RENAME TO trade_lots_old")
        
        # 2. Create new table without 'coins'
        cursor.execute("""
            CREATE TABLE trade_lots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                description VARCHAR DEFAULT '',
                status VARCHAR DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Copy data (excluding coins)
        cursor.execute("""
            INSERT INTO trade_lots (id, user_id, description, status, created_at)
            SELECT id, user_id, description, status, created_at FROM trade_lots_old
        """)
        
        # 4. Drop old table
        cursor.execute("DROP TABLE trade_lots_old")
        
        print("'trade_lots' table updated successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error migrating 'trade_lots': {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
