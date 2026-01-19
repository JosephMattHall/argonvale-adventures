import sqlite3

def migrate():
    conn = sqlite3.connect('argonvale.db')
    cursor = conn.cursor()

    print("Checking for users.pvp_wins...")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN pvp_wins INTEGER DEFAULT 0")
        print("Added users.pvp_wins")
    except sqlite3.OperationalError:
        print("users.pvp_wins already exists")

    print("Checking for companions.busy_until...")
    try:
        cursor.execute("ALTER TABLE companions ADD COLUMN busy_until DATETIME")
        print("Added companions.busy_until")
    except sqlite3.OperationalError:
        print("companions.busy_until already exists")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
