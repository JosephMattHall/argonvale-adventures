import asyncio
import aiohttp
import json
import random
from typing import Dict, Any

# Configurations
BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"

async def get_token(session, username, password):
    print(f"Login request for {username}")
    async with session.post(f"{BASE_URL}/token", data={"username": username, "password": password}) as resp:
        if resp.status != 200:
            print(f"Failed to login {username}: {await resp.text()}")
            return None
        data = await resp.json()
        token = data["access_token"]
        print(f"Got token for {username}: {token[:20]}...")
        return token

async def create_user_if_not_exists(session, username, password):
    # Try login first to check existence
    token = await get_token(session, username, password)
    if token:
        print(f"User {username} already exists.")
        return

    async with session.post(f"{BASE_URL}/register", json={"username": username, "password": password, "email": f"{username}@example.com"}) as resp:
        if resp.status == 200:
            print(f"Created user {username}")
        else:
            print(f"Failed to create user {username}: {await resp.text()}")

async def create_starter(session, username, token):
    print(f"Creating starter for {username}...")
    async with session.ws_connect(f"{WS_URL}?token={token}") as ws:
        await ws.send_json({"type": "ChooseStarter", "species_name": "Emberfang"})
        print(f"Sent ChooseStarter request for {username}")
        # Wait for confirmation
        async for msg in ws:
             print(f"msg received: {msg.type}")
             if msg.type == aiohttp.WSMsgType.TEXT:
                print(f"data: {msg.data}")
                data = json.loads(msg.data)
                events = data if isinstance(data, list) else [data]
                for evt in events:
                    if evt.get("type") == "CompanionCreated":
                        print(f"Starter created for {username}")
                        return
             elif msg.type == aiohttp.WSMsgType.CLOSED:
                 print("Socket closed unexpectedly")
                 return

async def get_companion(session, username, token):
    headers = {"Authorization": f"Bearer {token}"}
    for attempt in range(3):
        async with session.get(f"{BASE_URL}/api/profiles/{username}/companions", headers=headers) as resp:
            if resp.status != 200:
                print(f"Failed to get companions for {username}")
                return None
            items = await resp.json()
            if items:
                return items[0]["id"]
            
            # Create starter if needed
            if attempt == 0:
                await create_starter(session, username, token)
                await asyncio.sleep(1)
    return None

async def run_client(username, password, opponent_username):
    if username == "user_b":
        await asyncio.sleep(2) # Stagger start
    async with aiohttp.ClientSession() as session:
        # Setup
        await create_user_if_not_exists(session, username, password)
        token = await get_token(session, username, password)
        if not token: return

        companion_id = await get_companion(session, username, token)
        if not companion_id:
            print(f"{username} failed to get/create companion")
            return

        print(f"--- {username} Connecting ---")
        async with session.ws_connect(f"{WS_URL}?token={token}") as ws:
            # 1. Join Queue
            print(f"{username} Joining PvP Queue with Companion {companion_id}...")
            await ws.send_json({"type": "JoinPvPQueue", "companion_id": companion_id})

            combat_id = None
            
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    # Handle batch
                    events = data if isinstance(data, list) else [data]
                    
                    for event in events:
                        evt_type = event.get("type")
                        
                        if evt_type == "CombatStarted":
                            combat_id = event["combat_id"]
                            print(f"✅ {username} MATCH FOUND! Combat ID: {combat_id}")
                            
                            # VERIFICATION: Check Perspective
                            # If I am User A, 'player_hp' should be MY hp. 'enemy_name' should be User B.
                            enemy_name = event['context'].get('enemy_name')
                            print(f"   Perspective Check: My Enemy is '{enemy_name}' (Should be {opponent_username})")
                            
                            if enemy_name != opponent_username:
                                print(f"❌ {username} sees wrong enemy! Saw {enemy_name}, expected {opponent_username}")
                            else:
                                print(f"✅ {username} sees correct enemy.")

                            # START BATTLE: Send Attack immediately
                            await asyncio.sleep(0.5) # Slight delay
                            print(f"{username} attacking...")
                            await ws.send_json({
                                "type": "CombatAction",
                                "combat_id": combat_id,
                                "action_type": "attack",
                                "stance": "normal"
                            })

                        elif evt_type == "TurnProcessed":
                            print(f"⚔️ {username} received Turn result:")
                            print(f"   Desc: {event.get('description')}")
                            
                            # VERIFICATION CRITERIA
                            # User A attacked User B.
                            # User B attacked User A.
                            # So both should see ~equal HP loss if simultaneous.
                            # But specifically, the fields:
                            # 'attacker_hp' = My HP
                            # 'defender_hp' = Enemy HP
                            
                            my_hp = event.get('attacker_hp')
                            enemy_hp = event.get('defender_hp')
                            print(f"   UPDATE: MyHP={my_hp} EnemyHP={enemy_hp}")
                            
                            if my_hp < 100: # Assuming max is 100
                                 print(f"   (I took damage, so 'attacker_hp' correctly reflects ME)")
                            
                            if "Battle Over" in event.get("description", "") or event.get("defender_hp") <= 0 or event.get("attacker_hp") <= 0: 
                                return

                        elif evt_type == "CombatEnded":
                            print(f"🏁 {username} Battle Ended. Winner: {event.get('winner_id')}")
                            return

async def main():
    # Run two clients concurrently
    await asyncio.gather(
        run_client("user_a", "password123", "user_b"),
        run_client("user_b", "password123", "user_a")
    )

if __name__ == "__main__":
    asyncio.run(main())
