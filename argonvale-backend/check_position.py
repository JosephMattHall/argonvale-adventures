import sqlite3

def check_position():
    try:
        conn = sqlite3.connect('argonvale.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT username, last_x, last_y, last_zone_id FROM users WHERE username = 'james'")
        row = cursor.fetchone()
        
        if row:
            print(f"User: {row[0]}, X: {row[1]}, Y: {row[2]}, Zone: {row[3]}")
        else:
            print("User 'james' not found.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_position()
