from app.db.session import SessionLocal
from app.models.user import User

def fix_position():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "james").first()
        if user:
            print(f"User {user.username} found at {user.last_x}, {user.last_y} in {user.last_zone_id}")
            if user.last_x > 29 or user.last_y > 29:
                print("User is out of bounds. Resetting to 15, 15.")
                user.last_x = 15
                user.last_y = 15
                user.last_zone_id = "town" # Reset to town
                db.commit()
                print("Position reset.")
            else:
                print("User is within bounds (<= 29). Forcing reset anyway to be safe.")
                user.last_x = 15
                user.last_y = 15
                user.last_zone_id = "town"
                db.commit()
                print("Position reset.")
        else:
            print("User 'james' not found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_position()
