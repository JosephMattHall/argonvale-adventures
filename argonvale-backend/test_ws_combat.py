
import json
import asyncio
import websockets

async def test_combat_start():
    uri = "ws://localhost:8000/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqb3NlcGgiLCJleHAiOjE3Njg3OTY4MDB9.YvpqO9K6Mvh5HMgyctG1yJCoAEb7y1gqiTl0R-3cSp0"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket")
            
            # Message to enter combat
            msg = {
                "type": "EnterCombat",
                "opponent": {
                    "name": "Storm Raptor",
                    "species": "Galehorn Raptor",
                    "type": "Wind",
                    "stats": {"STR": 10, "DEF": 3, "HP": 35}
                },
                "companion_id": 1
            }
            
            print(f"Sending: {json.dumps(msg)}")
            await websocket.send(json.dumps(msg))
            
            # Wait for response
            response = await websocket.recv()
            print(f"Received: {response}")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_combat_start())
