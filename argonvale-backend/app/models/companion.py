from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Companion(Base):
    __tablename__ = "companions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    species = Column(String, nullable=False)  # e.g., "Emberfang", "Stoneback Tortoise"
    element = Column(String, nullable=False)  # "Fire", "Earth", "Wind", "Shadow", "Water"
    image_url = Column(String, default="default_companion.png")
    
    # Stats
    strength = Column(Integer, default=10)
    defense = Column(Integer, default=10)
    speed = Column(Integer, default=10)
    level = Column(Integer, default=1)
    hp = Column(Integer, default=100)
    max_hp = Column(Integer, default=100)
    xp = Column(Integer, default=0)

    # Management
    status = Column(String, default="active")  # active, boarding, training, expedition
    busy_until = Column(DateTime, nullable=True) # For timer-based tasks
    is_active = Column(Boolean, default=True)  # In active party (max 4)
    
    # Hunger System
    hunger = Column(Integer, default=100) # 0-100
    last_fed_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="companions")

