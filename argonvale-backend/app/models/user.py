from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Profile & Economy
    coins = Column(Integer, default=0)
    bio = Column(String, default="")
    avatar_url = Column(String, default="default_avatar.png")  # 50x50px
    last_active = Column(String, default="")  # ISO format timestamp
    mail_preference = Column(String, default="everyone")  # 'friends' or 'everyone'
    has_starter = Column(Boolean, default=False)  # Whether user has selected starter companion
    
    # Exploration Persistence
    last_x = Column(Integer, default=8)
    last_y = Column(Integer, default=8)
    last_zone_id = Column(String, default="town")

    companions = relationship("Companion", back_populates="owner")
    items = relationship("Item", back_populates="owner")

