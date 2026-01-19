from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.db.session import get_db
from app.models.user import User
from app.models.social import Message
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/messages", tags=["messages"])

class MessageCreate(BaseModel):
    recipient_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    is_read: bool
    timestamp: datetime
    sender_username: str
    
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    user_id: int
    username: str
    avatar_url: str
    last_message: str
    last_message_time: datetime
    unread_count: int

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of conversations with unread counts"""
    # Get all users the current user has messaged with
    sent_to = db.query(Message.recipient_id).filter(Message.sender_id == current_user.id).distinct()
    received_from = db.query(Message.sender_id).filter(Message.recipient_id == current_user.id).distinct()
    
    user_ids = set()
    for row in sent_to:
        user_ids.add(row[0])
    for row in received_from:
        user_ids.add(row[0])
    
    conversations = []
    for user_id in user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue
        
        # Get last message
        last_message = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.recipient_id == user_id),
                and_(Message.sender_id == user_id, Message.recipient_id == current_user.id)
            )
        ).order_by(Message.timestamp.desc()).first()
        
        # Count unread messages
        unread_count = db.query(Message).filter(
            Message.sender_id == user_id,
            Message.recipient_id == current_user.id,
            Message.is_read == False
        ).count()
        
        if last_message:
            conversations.append({
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "last_message": last_message.content[:50],
                "last_message_time": last_message.timestamp,
                "unread_count": unread_count
            })
    
    # Sort by last message time
    conversations.sort(key=lambda x: x["last_message_time"], reverse=True)
    return conversations

@router.get("/conversation/{user_id}", response_model=List[MessageResponse])
def get_conversation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages with specific user"""
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.recipient_id == user_id),
            and_(Message.sender_id == user_id, Message.recipient_id == current_user.id)
        )
    ).order_by(Message.timestamp.asc()).all()
    
    # Add sender username to each message
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "content": msg.content,
            "is_read": msg.is_read,
            "timestamp": msg.timestamp,
            "sender_username": sender.username if sender else "Unknown"
        })
    
    return result

@router.post("/send")
def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message"""
    recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    message = Message(
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        content=message_data.content,
        is_read=False
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # TODO: Send WebSocket notification to recipient
    
    return {"message": "Message sent", "id": message.id}

@router.put("/read/{conversation_user_id}")
def mark_conversation_read(
    conversation_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all messages in conversation as read"""
    db.query(Message).filter(
        Message.sender_id == conversation_user_id,
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return {"message": "Messages marked as read"}

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get total unread message count"""
    count = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).count()
    
    return {"count": count}
class StartConversation(BaseModel):
    username: str
    content: str

@router.post("/start")
def start_conversation(
    conv_data: StartConversation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new conversation by username"""
    recipient = db.query(User).filter(User.username == conv_data.username).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Create the first message
    message = Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        content=conv_data.content,
        is_read=False,
        timestamp=datetime.utcnow()
    )
    db.add(message)
    db.commit()
    
    return {"message": "Conversation started", "recipient_id": recipient.id}
