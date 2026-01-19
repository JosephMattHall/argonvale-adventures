
import sqlite3

def check_db():
    conn = sqlite3.connect('argonvale.db')
    cursor = conn.cursor()
    
    print("--- USERS ---")
    cursor.execute("SELECT id, username, coins, has_starter FROM users")
    users = cursor.fetchall()
    for user in users:
        print(user)
        
    print("\n--- COMPANIONS ---")
    cursor.execute("SELECT id, name, species, owner_id, is_active FROM companions")
    companions = cursor.fetchall()
    for companion in companions:
        print(companion)
        
    conn.close()

if __name__ == "__main__":
    check_db()
