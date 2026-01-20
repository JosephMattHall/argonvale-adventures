import os
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, Token, UserResponse
from app.auth.security import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM

load_dotenv()

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"DEBUG: Login attempt for username: {form_data.username}")
    print(f"DEBUG: Password provided: {form_data.password}")
    
    user = get_user_by_username(db, form_data.username)
    if not user:
        print("DEBUG: User not found in DB")
    else:
        print(f"DEBUG: User found. Hashed password: {user.hashed_password}")
        is_valid = verify_password(form_data.password, user.hashed_password)
        print(f"DEBUG: Password verification result: {is_valid}")
        # Re-check logic to ensure verify_password isn't silently failing or returning None
            
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

@router.get("/api/auth/google/login")
async def login_google(request: Request):
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/api/auth/google/callback")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        print(f"DEBUG: OAuth error: {e}")
        raise HTTPException(status_code=400, detail="Google authentication failed")
        
    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")
        
    email = user_info.get('email')
    google_id = user_info.get('sub')
    name = user_info.get('name')
    picture = user_info.get('picture')
    
    # Try to find user by google_id or email
    user = db.query(User).filter((User.google_id == google_id) | (User.email == email)).first()
    
    if not user:
        # Create new user
        # For username, use email prefix or name if available
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
            
        user = User(
            email=email,
            username=username,
            google_id=google_id,
            avatar_url=picture or "default_avatar.png",
            hashed_password=None # Password-less login
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_id:
        # Link existing email-based account to Google
        user.google_id = google_id
        if not user.avatar_url or user.avatar_url == "default_avatar.png":
            user.avatar_url = picture
        db.commit()
        db.refresh(user)
        
    access_token_expires = timedelta(minutes=1440) # 24 hours for OAuth
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    needs_starter = "true" if not user.has_starter else "false"
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    return RedirectResponse(url=f"{frontend_url}/login/callback?token={access_token}&needs_starter={needs_starter}")
