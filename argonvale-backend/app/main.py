from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.db.session import engine, Base

# Create tables on startup (for dev simplicity)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Argonvale Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth & WebSocket
app.include_router(auth_router.router, tags=["auth"])
from app.websocket import router as ws_router
app.include_router(ws_router.router, tags=["websocket"])

# New API endpoints
from app.api import profiles, friends, messages, companions, equipment, shop
app.include_router(profiles.router)
app.include_router(friends.router)
app.include_router(messages.router)
app.include_router(companions.router)
app.include_router(equipment.router)
app.include_router(shop.router, prefix="/api/shop", tags=["shop"])

@app.get("/")
def read_root():
    return {"message": "Argonvale Backend Online"}

