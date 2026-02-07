from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.db.session import Base
import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, index=True)
    admin_username = Column(String)
    action = Column(String) # e.g. "update_role", "ban_user"
    target_type = Column(String) # e.g. "user", "item"
    target_id = Column(String)
    changes = Column(JSON) # e.g. {"role": {"from": "user", "to": "admin"}}
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
