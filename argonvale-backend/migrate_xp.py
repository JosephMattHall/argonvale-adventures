
import sqlite3
import os

def migrate():
    db_path = 'argonvale.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Adding 'xp' column to 'companions' table...")
        # Add the xp column
        cursor.execute("ALTER TABLE companions ADD COLUMN xp INTEGER DEFAULT 0")
        print("Successfully added 'xp' column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name: xp" in str(e).lower():
            print("'xp' column already exists.")
        else:
            print(f"Error adding 'xp' column: {e}")
            conn.rollback()
            return

    try:
        print("Updating 'has_starter' for users with companions...")
        # Find all user IDs who have at least one companion
        cursor.execute("SELECT DISTINCT owner_id FROM companions")
        owner_ids = [row[0] for row in cursor.fetchall()]
        
        for owner_id in owner_ids:
            cursor.execute("UPDATE users SET has_starter = 1 WHERE id = ?", (owner_id,))
            print(f"Updated user ID {owner_id} to has_starter = 1")
            
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Error during data update: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
