from app.db.session import SessionLocal
from app.models.item import Item

db = SessionLocal()
try:
    templates = db.query(Item).filter(Item.is_template == True).count()
    shop_items = db.query(Item).filter(Item.owner_id == None, Item.is_template == False).count()
    print(f"Templates: {templates}")
    print(f"Shop Items: {shop_items}")
finally:
    db.close()
