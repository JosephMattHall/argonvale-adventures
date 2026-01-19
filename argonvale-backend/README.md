# Argonvale Backend

Core game engine and backend for Argonvale, powered by FastAPI and PSPF (Python Stream Processing Framework).

## Architecture

The project enforces a strict Separation of Concerns:

*   **FastAPI (Edge Layer)**: Handles Auth, WebSocket connections, and translating user commands into events. It is stateless regarding game logic.
*   **PSPF (Game Engine)**: Authoritative, event-sourced game logic. All logic (Combat, Training, Trading) lives here and is deterministic.
*   **SQLAlchemy (Persistence)**: Stores base entity data (Users, Companions). State derivation happens in PSPF logic.

## Key Game Systems

*   **Combat**: Turn-based, deterministic damage calculation. No client-side authority.
*   **Training**: Time-based progression with deterministic RNG seeded by event IDs.
*   **Exploration**: Zone-based event generation.

## Running Locally

1.  **Install Dependencies**:
    ```bash
    ../.venv/bin/pip install -r requirements.txt (or use pyproject.toml)
    ```

2.  **Start Server**:
    ```bash
    ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
    ```

3.  **Run Tests**:
    ```bash
    ../.venv/bin/python tests/test_combat.py
    ```

## API

*   HTTP: `POST /register`, `POST /token`
*   WebSocket: `ws://localhost:8000/ws`
