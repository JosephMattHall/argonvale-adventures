from app.db.session import SessionLocal
from app.services.restock_service import restock_shop

db = SessionLocal()
try:
    print("Triggering manual restock...")
    restock_shop(db)
    print("Manual restock complete.")
finally:
    db.close()
