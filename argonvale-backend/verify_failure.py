
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.companion import Companion
from app.models.user import User

def verify_failure():
    db = SessionLocal()
    try:
        print("Attempting to query companions...")
        companions = db.query(Companion).all()
        print(f"Success: Found {len(companions)} companions")
    except Exception as e:
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_failure()
