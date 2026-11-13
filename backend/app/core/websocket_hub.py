import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("WebSocketHub")

class WebSocketHub:
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.active_users: Dict[int, Set[WebSocket]] = {}
        # Admin sockets for system-wide broadcast
        self.admin_sockets: Set[WebSocket] = set()

    @property
    def active_connections(self):
        return self.active_users

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        await websocket.accept()
        if user_id not in self.active_users:
            self.active_users[user_id] = set()
        self.active_users[user_id].add(websocket)

        if role.upper() in ["ADMIN", "TECHNICIAN"]:
            self.admin_sockets.add(websocket)

        logger.info(f"Client connected: User {user_id} (Role: {role}). Total active users: {len(self.active_users)}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_users:
            self.active_users[user_id].discard(websocket)
            if not self.active_users[user_id]:
                del self.active_users[user_id]
        self.admin_sockets.discard(websocket)
        logger.info(f"Client disconnected: User {user_id}. Active users: {len(self.active_users)}")

    async def send_to_user(self, user_id, event_type: str, data: dict):
        """Send a real-time event to a specific user (all their active windows/tabs)."""
        if user_id is None:
            return
        payload = json.dumps({"event": event_type, "data": data})
        targets = set()
        try:
            uid_int = int(user_id)
            if uid_int in self.active_users:
                targets.update(self.active_users[uid_int])
        except (ValueError, TypeError):
            pass

        if user_id in self.active_users:
            targets.update(self.active_users[user_id])

        for ws in list(targets):
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")

    async def broadcast_to_admins(self, event_type: str, data: dict):
        """Broadcast live telemetry and tickets to all online IT Admins and Technicians."""
        payload = json.dumps({"event": event_type, "data": data})
        for ws in list(self.admin_sockets):
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to broadcast to admin: {e}")
                self.admin_sockets.discard(ws)

    async def broadcast_all(self, event_type: str, data: dict):
        """Broadcast an event to every single connected client."""
        payload = json.dumps({"event": event_type, "data": data})
        for user_id, sockets in list(self.active_users.items()):
            for ws in list(sockets):
                try:
                    await ws.send_text(payload)
                except Exception:
                    sockets.discard(ws)

hub = WebSocketHub()

