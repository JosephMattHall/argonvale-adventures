import asyncio
import websockets

async def test_ws():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as websocket:
        await websocket.send("Hello PSPF")
        response = await websocket.recv()
        print(f"Received: {response}")
        assert response == "Processed: Hello PSPF"
        print("WebSocket Test Passed")

if __name__ == "__main__":
    asyncio.run(test_ws())
