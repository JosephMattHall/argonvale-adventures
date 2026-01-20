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
        print("Fixing 'users' table constraints...")
        
        # 1. Create a new table with the correct schema
        # hashed_password is now NULLable
        cursor.execute("""
            CREATE TABLE users_new (
                id INTEGER NOT NULL PRIMARY KEY, 
                username VARCHAR NOT NULL UNIQUE, 
                email VARCHAR NOT NULL UNIQUE, 
                hashed_password VARCHAR, 
                coins INTEGER DEFAULT 0, 
                bio VARCHAR DEFAULT '', 
                avatar_url VARCHAR DEFAULT 'default_avatar.png', 
                last_active VARCHAR DEFAULT '', 
                mail_preference VARCHAR DEFAULT 'everyone', 
                has_starter BOOLEAN DEFAULT 0, 
                last_x INTEGER DEFAULT 8, 
                last_y INTEGER DEFAULT 8, 
                last_zone_id TEXT DEFAULT 'town', 
                title TEXT DEFAULT 'Novice Adventurer', 
                titles_unlocked TEXT DEFAULT '["Novice Adventurer"]', 
                pvp_wins INTEGER DEFAULT 0, 
                role TEXT DEFAULT 'user', 
                last_move_at FLOAT DEFAULT 0.0, 
                google_id TEXT UNIQUE
            )
        """)

        # 2. Copy data from the old table to the new one
        # Match columns precisely
        cursor.execute("""
            INSERT INTO users_new (
                id, username, email, hashed_password, coins, bio, avatar_url, 
                last_active, mail_preference, has_starter, last_x, last_y, 
                last_zone_id, title, titles_unlocked, pvp_wins, role, 
                last_move_at, google_id
            )
            SELECT 
                id, username, email, hashed_password, coins, bio, avatar_url, 
                last_active, mail_preference, has_starter, last_x, last_y, 
                last_zone_id, title, titles_unlocked, pvp_wins, role, 
                last_move_at, google_id
            FROM users
        """)

        # 3. Drop the old table
        cursor.execute("DROP TABLE users")

        # 4. Rename the new table
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        
        # 5. Recreate indexes if necessary (google_id and username already handled by UNIQUE in CREATE TABLE)
        # SQLAlchemy usually handles its own indexes, but let's ensure the ones we need are there.
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)")

        print("Users table successfully recreated with updated constraints.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise e

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
