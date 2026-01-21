from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Auction(Base):
    __tablename__ = "auctions"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    
    start_price = Column(Integer, nullable=False)
    min_increment = Column(Integer, default=1)
    current_bid = Column(Integer, default=0)
    high_bidder_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, default="active") # active, completed, expired

    bids = relationship("Bid", back_populates="auction")

class Bid(Base):
    __tablename__ = "bids"

    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"))
    bidder_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    auction = relationship("Auction", back_populates="bids")

class TradeLot(Base):
    __tablename__ = "trade_lots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    description = Column(String, default="")
    status = Column(String, default="active") # active, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trade_lots")
    items = relationship("Item", back_populates="trade_lot")
    offers = relationship("TradeOffer", back_populates="lot")

class TradeOffer(Base):
    __tablename__ = "trade_offers"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("trade_lots.id"))
    offerer_id = Column(Integer, ForeignKey("users.id"))
    
    offered_coins = Column(Integer, default=0)
    # List of Item IDs offered
    offered_items = Column(JSON, default=[]) 
    
    status = Column(String, default="pending") # pending, accepted, rejected
    timestamp = Column(DateTime, default=datetime.utcnow)

    lot = relationship("TradeLot", back_populates="offers")
    offerer = relationship("User")
    items = relationship("Item", back_populates="trade_offer")
