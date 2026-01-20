from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.auth.security import get_admin_user
from app.models.user import User
from app.schemas.user import User as UserSchema

router = APIRouter()

@router.get("/users", response_model=List[UserSchema])
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    return db.query(User).all()

@router.get("/stats")
def get_system_stats(admin: User = Depends(get_admin_user)):
    return {
        "status": "online",
        "version": "1.0.0-prod-ready",
        "multiplayer_sync": "enabled (valkey)"
    }
from pydantic import BaseModel
from app.models.audit import AuditLog

class UpdateRoleSchema(BaseModel):
    role: str

@router.post("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UpdateRoleSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = user.role
    user.role = data.role
    
    # Audit Logging
    audit = AuditLog(
        admin_id=admin.id,
        admin_username=admin.username,
        action="update_role",
        target_type="user",
        target_id=str(user_id),
        changes={"role": {"from": old_role, "to": data.role}}
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Updated role for {user.username} to {data.role}"}

@router.get("/audit", response_model=List[dict])
def get_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "admin_username": l.admin_username,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "changes": l.changes,
            "timestamp": l.timestamp.isoformat()
        } for l in logs
    ]
