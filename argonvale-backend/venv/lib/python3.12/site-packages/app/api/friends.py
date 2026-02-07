from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.social import Friendship
from app.auth.security import get_current_user
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/friends", tags=["friends"])

class FriendResponse(BaseModel):
    id: int
    username: str
    avatar_url: str
    is_online: bool = False
    
    class Config:
        from_attributes = True

class FriendRequestResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    requester: FriendResponse
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[FriendResponse])
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's friends list"""
    friendships = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) | (Friendship.friend_id == current_user.id)),
        Friendship.status == "accepted"
    ).all()
    
    friends = []
    from app.websocket.router import game_server
    
    for friendship in friendships:
        friend_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
        friend = db.query(User).filter(User.id == friend_id).first()
        if friend:
            friend_dict = {
                "id": friend.id,
                "username": friend.username,
                "avatar_url": friend.avatar_url,
                "is_online": game_server.is_user_online(friend.id)
            }
            friends.append(friend_dict)
    
    return friends

@router.get("/online", response_model=List[FriendResponse])
def get_online_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get only friends who are currently online"""
    friendships = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) | (Friendship.friend_id == current_user.id)),
        Friendship.status == "accepted"
    ).all()
    
    online_friends = []
    from app.websocket.router import game_server
    
    for friendship in friendships:
        friend_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
        if game_server.is_user_online(friend_id):
            friend = db.query(User).filter(User.id == friend_id).first()
            if friend:
                online_friends.append({
                    "id": friend.id,
                    "username": friend.username,
                    "avatar_url": friend.avatar_url,
                    "is_online": True
                })
    
    return online_friends

@router.get("/requests", response_model=List[FriendRequestResponse])
def get_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pending friend requests"""
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        requester = db.query(User).filter(User.id == req.user_id).first()
        result.append({
            "id": req.id,
            "user_id": req.user_id,
            "friend_id": req.friend_id,
            "status": req.status,
            "created_at": req.created_at,
            "requester": requester
        })
    
    return result

@router.post("/request/{username}")
def send_friend_request(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send friend request"""
    target_user = db.query(User).filter(User.username == username).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    # Check if friendship already exists
    existing = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) & (Friendship.friend_id == target_user.id)) |
        ((Friendship.user_id == target_user.id) & (Friendship.friend_id == current_user.id))
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=target_user.id,
        status="pending"
    )
    db.add(friendship)
    db.commit()
    
    return {"message": "Friend request sent"}

@router.post("/accept/{request_id}")
def accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept friend request"""
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    friendship.status = "accepted"
    db.commit()
    
    return {"message": "Friend request accepted"}

@router.delete("/{friend_id}")
def remove_friend(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove friend"""
    friendship = db.query(Friendship).filter(
        ((Friendship.user_id == current_user.id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == current_user.id))
    ).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Friend removed"}
