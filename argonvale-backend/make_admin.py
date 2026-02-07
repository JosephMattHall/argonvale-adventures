from app.db.session import SessionLocal
from app.models.user import User
import sys

def make_admin(username):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User {username} not found.")
            return

        user.role = "admin"
        db.commit()
        print(f"User {username} is now an admin.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    make_admin("james")
