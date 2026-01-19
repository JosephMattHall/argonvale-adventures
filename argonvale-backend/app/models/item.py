from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    item_type = Column(String, nullable=False) # weapon, potion, material
    
    # Stores the JSON representation of app.schemas.items.WeaponStats
    # e.g. {"attack": {"fire": 10}, "reflection": {"fire": 0.5}}
    weapon_stats = Column(JSON, default={})
    is_equipped = Column(Boolean, default=False)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="items")
