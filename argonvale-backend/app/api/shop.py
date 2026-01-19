from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.auth.security import get_current_user
from app.models.user import User
from app.models.item import Item
from pydantic import BaseModel

router = APIRouter()

class ShopItemResponse(BaseModel):
    id: int
    name: str
    item_type: str
    price: int
    stats: dict

@router.get("/items", response_model=List[ShopItemResponse])
def get_shop_items(db: Session = Depends(get_db)):
    # Shop items are those with owner_id = None (System items)
    items = db.query(Item).filter(Item.owner_id == None).all()
    return [
        ShopItemResponse(
            id=i.id,
            name=i.name,
            item_type=i.item_type,
            price=i.price,
            stats=i.weapon_stats
        ) for i in items
    ]

@router.post("/buy/{item_id}")
def buy_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the system item (template)
    template = db.query(Item).filter(Item.id == item_id, Item.owner_id == None).first()
    if not template:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if current_user.coins < template.price:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Deduct coins
    current_user.coins -= template.price
    
    # Create new item for user
    new_item = Item(
        name=template.name,
        item_type=template.item_type,
        weapon_stats=template.weapon_stats,
        price=template.price,
        owner_id=current_user.id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {"message": f"Successfully purchased {template.name}", "item_id": new_item.id}
