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
    category: str
    description: str
    image_url: str
    stats: dict
    effect: dict
    rarity: str
    stock: int

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
            category=i.category,
            description=i.description,
            image_url=i.image_url,
            stats=i.weapon_stats,
            effect=i.effect,
            rarity=i.rarity,
            stock=i.stock
        ) for i in items if i.owner_id is None and not i.is_template and i.stock > 0
    ]

@router.post("/buy/{item_id}")
def buy_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the system item listing (not template) with stock
    item_listing = db.query(Item).filter(
        Item.id == item_id, 
        Item.owner_id == None, 
        Item.is_template == False,
        Item.stock > 0
    ).first()
    if not item_listing:
        raise HTTPException(status_code=404, detail="Item out of stock or not found")
    
    if current_user.coins < item_listing.price:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Use a transaction to ensure atomicity
    try:
        # We don't use db.begin() here because Depends(get_db) 
        # already provides a session that is managed.
        # However, we can use a nested transaction or just ensure we commit at once.
        # For maximum safety, we'll manually manage the transaction for this critical path.
        
        # Deduct coins and decrease stock
        current_user.coins -= item_listing.price
        item_listing.stock -= 1
        
        # Create new item for user (copy from listing)
        new_item = Item(
            name=item_listing.name,
            item_type=item_listing.item_type,
            category=item_listing.category,
            description=item_listing.description,
            image_url=item_listing.image_url,
            weapon_stats=item_listing.weapon_stats,
            effect=item_listing.effect,
            price=item_listing.price,
            rarity=item_listing.rarity,
            owner_id=current_user.id,
            is_template=False,
            stock=1 
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return {"message": f"Successfully purchased {item_listing.name}", "item_id": new_item.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

@router.post("/sell/{item_id}")
def sell_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Item).filter(Item.id == item_id, Item.owner_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.is_equipped:
        raise HTTPException(status_code=400, detail="Cannot sell equipped items")
    
    if item.trade_lot_id is not None:
        raise HTTPException(status_code=400, detail="Cannot sell items currently in a trade lot")

    # Sell for 50% of price
    sell_price = max(1, item.price // 2)
    current_user.coins += sell_price
    
    db.delete(item)
    db.commit()
    
    return {"status": "success", "message": f"Sold {item.name} for {sell_price} coins", "new_balance": current_user.coins}
