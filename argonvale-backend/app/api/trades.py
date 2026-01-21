from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.auth.security import get_current_user
from app.models.user import User
from app.models.economy import TradeLot
from app.models.item import Item
from pydantic import BaseModel
import datetime

router = APIRouter()

class TradeLotCreate(BaseModel):
    item_ids: List[int]
    description: str = ""

class ItemInfo(BaseModel):
    id: int
    name: str
    rarity: str
    category: str
    image_url: str

    class Config:
        from_attributes = True

class TradeLotResponse(BaseModel):
    id: int
    user_id: int
    username: str
    created_at: datetime.datetime
    description: str
    items: List[ItemInfo]

    class Config:
        from_attributes = True

@router.post("/", response_model=TradeLotResponse)
def create_trade_lot(
    data: TradeLotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Max 10 lots per user
    lot_count = db.query(TradeLot).filter(TradeLot.user_id == current_user.id).count()
    if lot_count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 trade lots allowed")

    # 2. Validation: Max 5 items per lot
    if not (1 <= len(data.item_ids) <= 5):
        raise HTTPException(status_code=400, detail="A lot must have between 1 and 5 items")

    # 3. Validation: Verify items ownership and lock status
    items = db.query(Item).filter(Item.id.in_(data.item_ids)).all()
    if len(items) != len(data.item_ids):
        raise HTTPException(status_code=400, detail="One or more items not found")

    for item in items:
        if item.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not own all these items")
        if item.trade_lot_id is not None:
            raise HTTPException(status_code=400, detail=f"Item {item.name} is already in a trade lot")
        if item.is_equipped:
            raise HTTPException(status_code=400, detail=f"Item {item.name} is equipped and cannot be traded")

    new_lot = TradeLot(
        user_id=current_user.id,
        description=data.description
    )
    db.add(new_lot)
    db.flush() # Get ID

    # 5. Link items
    for item in items:
        item.trade_lot_id = new_lot.id

    db.commit()
    db.refresh(new_lot)

    # Prepare response
    return {
        "id": new_lot.id,
        "user_id": new_lot.user_id,
        "username": current_user.username,
        "created_at": new_lot.created_at,
        "description": new_lot.description,
        "items": new_lot.items
    }

@router.get("/", response_model=List[TradeLotResponse])
def list_trade_lots(
    page: int = Query(1, ge=1),
    username: Optional[str] = None,
    item_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TradeLot).join(User)

    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))

    if item_name:
        # Search for lots containing an item with this name
        query = query.join(Item).filter(Item.name.ilike(f"%{item_name}%")).distinct()

    # Pagination
    limit = 10
    offset = (page - 1) * limit
    lots = query.order_by(TradeLot.created_at.desc()).offset(offset).limit(limit).all()

    response = []
    for lot in lots:
        response.append({
            "id": lot.id,
            "user_id": lot.user_id,
            "username": lot.user.username,
            "created_at": lot.created_at,
            "description": lot.description,
            "items": lot.items
        })
    return response

@router.get("/user/{username}", response_model=List[TradeLotResponse])
def get_user_trade_lots(
    username: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    lots = db.query(TradeLot).filter(TradeLot.user_id == user.id).order_by(TradeLot.created_at.desc()).all()
    
    response = []
    for lot in lots:
        response.append({
            "id": lot.id,
            "user_id": lot.user_id,
            "username": user.username,
            "created_at": lot.created_at,
            "description": lot.description,
            "items": lot.items
        })
    return response

@router.delete("/{lot_id}")
def delete_trade_lot(
    lot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lot = db.query(TradeLot).filter(TradeLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Trade lot not found")
    
    if lot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this trade lot")

    # Unlink items
    db.query(Item).filter(Item.trade_lot_id == lot_id).update({"trade_lot_id": None})

    db.delete(lot)
    db.commit()
    
    return {"status": "success"}

@router.get("/my", response_model=List[TradeLotResponse])
def get_my_trade_lots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lots = db.query(TradeLot).filter(TradeLot.user_id == current_user.id).order_by(TradeLot.created_at.desc()).all()
    
    response = []
    for lot in lots:
        response.append({
            "id": lot.id,
            "user_id": lot.user_id,
            "username": current_user.username,
            "created_at": lot.created_at,
            "description": lot.description,
            "items": lot.items
        })
    return response

# --- Trade Offers ---

from app.models.economy import TradeOffer

class TradeOfferCreate(BaseModel):
    offered_coins: int = 0
    offered_item_ids: List[int] = []

class TradeOfferResponse(BaseModel):
    id: int
    lot_id: int
    offerer_id: int
    offerer_username: str
    offered_coins: int
    offered_items: List[ItemInfo]
    status: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

@router.post("/{lot_id}/offers", response_model=TradeOfferResponse)
def create_trade_offer(
    lot_id: int,
    data: TradeOfferCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lot = db.query(TradeLot).filter(TradeLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Trade lot not found")
    
    if lot.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot offer on your own trade lot")

    # Validation: Max 5 items per offer
    if len(data.offered_item_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 items allowed per offer")

    # Validation: Coins
    if data.offered_coins < 0:
        raise HTTPException(status_code=400, detail="Invalid coin amount")
    if data.offered_coins > current_user.coins:
        raise HTTPException(status_code=400, detail="Insufficient coins")

    # Validation: Items
    items = []
    if data.offered_item_ids:
        items = db.query(Item).filter(Item.id.in_(data.offered_item_ids)).all()
        if len(items) != len(data.offered_item_ids):
            raise HTTPException(status_code=400, detail="One or more items not found")
        
        for item in items:
            if item.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="You do not own all these items")
            if item.trade_lot_id is not None or item.trade_offer_id is not None:
                raise HTTPException(status_code=400, detail=f"Item {item.name} is already in a trade")
            if item.is_equipped:
                raise HTTPException(status_code=400, detail=f"Item {item.name} is equipped")

    # Lock coins (escrow)
    current_user.coins -= data.offered_coins

    # Create Offer
    new_offer = TradeOffer(
        lot_id=lot_id,
        offerer_id=current_user.id,
        offered_coins=data.offered_coins,
        offered_items=data.offered_item_ids,
        status="pending"
    )
    db.add(new_offer)
    db.flush()

    # Lock Items
    for item in items:
        item.trade_offer_id = new_offer.id

    db.commit()
    db.refresh(new_offer)

    return {
        "id": new_offer.id,
        "lot_id": new_offer.lot_id,
        "offerer_id": new_offer.offerer_id,
        "offerer_username": current_user.username,
        "offered_coins": new_offer.offered_coins,
        "offered_items": new_offer.items,
        "status": new_offer.status,
        "timestamp": new_offer.timestamp
    }

@router.get("/{lot_id}/offers", response_model=List[TradeOfferResponse])
def list_lot_offers(
    lot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lot = db.query(TradeLot).filter(TradeLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Trade lot not found")
    
    # Only the lot owner or the offerers can see offers? Usually just owner for now.
    if lot.user_id != current_user.id:
        # Check if the user has a pending offer themselves
        offers = db.query(TradeOffer).filter(TradeOffer.lot_id == lot_id, TradeOffer.offerer_id == current_user.id).all()
    else:
        offers = db.query(TradeOffer).filter(TradeOffer.lot_id == lot_id, TradeOffer.status == "pending").all()

    response = []
    for o in offers:
        response.append({
            "id": o.id,
            "lot_id": o.lot_id,
            "offerer_id": o.offerer_id,
            "offerer_username": o.offerer.username,
            "offered_coins": o.offered_coins,
            "offered_items": o.items,
            "status": o.status,
            "timestamp": o.timestamp
        })
    return response

@router.post("/offers/{offer_id}/accept")
def accept_trade_offer(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(TradeOffer).filter(TradeOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    lot = offer.lot
    if lot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the lot owner can accept offers")
    
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="Offer is no longer pending")

    # --- EXECUTE TRADE ---
    offerer = offer.offerer
    lot_owner = current_user

    # 1. Give offered coins to lot owner
    lot_owner.coins += offer.offered_coins

    # 2. Swap items
    # Items from lot -> offerer
    lot_items = db.query(Item).filter(Item.trade_lot_id == lot.id).all()
    for item in lot_items:
        item.owner_id = offerer.id
        item.trade_lot_id = None
    
    # Items from offer -> lot owner
    offer_items = db.query(Item).filter(Item.trade_offer_id == offer.id).all()
    for item in offer_items:
        item.owner_id = lot_owner.id
        item.trade_offer_id = None

    # 3. Clean up other offers for this lot
    # Refund coins and unlock items for other pending offers
    other_offers = db.query(TradeOffer).filter(TradeOffer.lot_id == lot.id, TradeOffer.id != offer.id, TradeOffer.status == "pending").all()
    for other in other_offers:
        # Refund coins
        other.offerer.coins += other.offered_coins
        # Unlock items
        db.query(Item).filter(Item.trade_offer_id == other.id).update({"trade_offer_id": None})
        other.status = "rejected"

    # 4. Finalize
    offer.status = "accepted"
    db.delete(lot)
    db.commit()

    return {"status": "success", "message": "Trade completed successfully"}

@router.post("/offers/{offer_id}/reject")
def reject_trade_offer(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(TradeOffer).filter(TradeOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.lot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the lot owner can reject offers")
    
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="Offer is no longer pending")

    # 1. Refund coins
    offer.offerer.coins += offer.offered_coins

    # 2. Unlock items
    db.query(Item).filter(Item.trade_offer_id == offer.id).update({"trade_offer_id": None})

    # 3. Update status
    offer.status = "rejected"
    db.commit()

    return {"status": "success"}

@router.delete("/offers/{offer_id}")
def cancel_trade_offer(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(TradeOffer).filter(TradeOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.offerer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own offers")
    
    if offer.status != "pending":
        raise HTTPException(status_code=400, detail="Offer is no longer pending")

    # 1. Refund coins
    current_user.coins += offer.offered_coins

    # 2. Unlock items
    db.query(Item).filter(Item.trade_offer_id == offer.id).update({"trade_offer_id": None})

    # 3. Delete offer
    db.delete(offer)
    db.commit()

    return {"status": "success"}
