from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = set()
        self.connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.connections:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                del self.connections[user_id]

    async def send_to_user(self, user_id: str, event: str, data: dict):
        if user_id not in self.connections:
            return
        message = json.dumps({"event": event, "data": data})
        dead = set()
        for ws in self.connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.connections[user_id].discard(ws)

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        for user_id, sockets in list(self.connections.items()):
            dead = set()
            for ws in sockets:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.connections[user_id].discard(ws)

manager = ConnectionManager()
