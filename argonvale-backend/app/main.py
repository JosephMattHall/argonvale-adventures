from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.logging import setup_logging
import asyncio
from app.db.session import SessionLocal
from app.services.restock_service import restock_shop
setup_logging()

from app.auth import router as auth_router
from app.db.session import engine, Base

# Create tables on startup (for dev simplicity)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Argonvale Backend")

from starlette.middleware.sessions import SessionMiddleware
from app.auth.security import SECRET_KEY

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Auth & WebSocket
app.include_router(auth_router.router, tags=["auth"])
from app.websocket import router as ws_router
app.include_router(ws_router.router, tags=["websocket"])

# New API endpoints
from app.api import profiles, friends, messages, companions, equipment, shop, management, admin
app.include_router(profiles.router)
app.include_router(friends.router)
app.include_router(messages.router)
app.include_router(companions.router)
app.include_router(equipment.router)
app.include_router(shop.router, prefix="/api/shop", tags=["shop"])
app.include_router(management.router)
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.on_event("startup")
async def startup_event():
    # Run initial restock
    db = SessionLocal()
    try:
        restock_shop(db)
    finally:
        db.close()
    
    # Start background task
    asyncio.create_task(background_restock())

async def background_restock():
    while True:
        # Restock every 20 minutes
        await asyncio.sleep(20 * 60)
        db = SessionLocal()
        try:
            restock_shop(db)
        finally:
            db.close()

@app.get("/")
def read_root():
    return {"message": "Argonvale Backend Online"}

