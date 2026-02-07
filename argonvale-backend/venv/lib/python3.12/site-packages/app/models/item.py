from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    item_type = Column(String, nullable=False) # weapon, potion, material, food
    description = Column(String, default="")
    image_url = Column(String, default="default_item.png")
    category = Column(String, default="misc") # weapons, armor, food, utility
    
    # Stores the JSON representation of app.schemas.items.WeaponStats
    # e.g. {"attack": {"fire": 10}, "reflection": {"fire": 0.5}}
    weapon_stats = Column(JSON, default={})
    
    # e.g. {"type": "freeze", "chance": 0.25}
    effect = Column(JSON, default={})
    
    price = Column(Integer, default=0)
    rarity = Column(String, default="Common") # Common, Uncommon, Rare, Ultra Rare, Relic
    stock = Column(Integer, default=1)
    is_template = Column(Boolean, default=False)
    is_equipped = Column(Boolean, default=False)
    is_consumable = Column(Boolean, default=False)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="items")

    trade_lot_id = Column(Integer, ForeignKey("trade_lots.id"), nullable=True)
    trade_lot = relationship("TradeLot", back_populates="items")

    trade_offer_id = Column(Integer, ForeignKey("trade_offers.id"), nullable=True)
    trade_offer = relationship("TradeOffer", back_populates="items")
