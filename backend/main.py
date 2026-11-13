import json
import logging
import socket
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.websocket_hub import hub
from app.api.router import api_router
from app.db.session import engine, Base, SessionLocal
from app.models.entities import User, Device, Ticket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CyberDeskAPI")

class DiscoveryBeaconProtocol(asyncio.DatagramProtocol):
    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, addr):
        try:
            if b"DISCOVER_CREATIVE_SERVER" in data:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                try:
                    s.connect(("8.8.8.8", 80))
                    local_ip = s.getsockname()[0]
                except Exception:
                    local_ip = "127.0.0.1"
                finally:
                    s.close()

                response = json.dumps({
                    "system": "Creative AI - IT Management & Helpdesk",
                    "ip": local_ip,
                    "port": 8000,
                    "status": "ONLINE"
                }).encode("utf-8")
                self.transport.sendto(response, addr)
                logger.info(f"Answered auto-discovery probe from {addr[0]} -> Reported IP: {local_ip}")
        except Exception as e:
            logger.debug(f"Discovery probe error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed if database is brand new
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty. Populating initial seed data...")
            from seed import populate_seed_data
            populate_seed_data(db)
    except Exception as e:
        logger.warning(f"Seed initialization notice: {e}")
    finally:
        db.close()

    # Start UDP discovery beacon for zero-config client connection
    beacon_transport = None
    try:
        loop = asyncio.get_running_loop()
        beacon_transport, _ = await loop.create_datagram_endpoint(
            lambda: DiscoveryBeaconProtocol(),
            local_addr=("0.0.0.0", 41234),
            reuse_port=False
        )
        logger.info("UDP Discovery Beacon ACTIVE on port 41234 (Zero-Config LAN Auto-Discovery)")
    except Exception as e:
        logger.warning(f"Could not bind UDP Discovery Beacon: {e}")
        
    yield

    if beacon_transport:
        try:
            beacon_transport.close()
        except Exception:
            pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for Electron / Vite Desktop Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "ws_endpoint": "/ws?user_id={id}&role={ADMIN|EMPLOYEE}"
    }

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int = Query(...),
    role: str = Query(...)
):
    await hub.connect(websocket, user_id, role)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                message = json.loads(text)
                event = message.get("event")
                data = message.get("data", {})

                # 1. Real-time Chat relay
                if event == "CHAT_SEND":
                    target_id = data.get("recipient_id")
                    await hub.send_to_user(target_id, "CHAT_MESSAGE", data)

                # 2. Live Telemetry stream from agent
                elif event == "TELEMETRY_STREAM":
                    await hub.broadcast_to_admins("DEVICE_TELEMETRY_UPDATE", data)

                # 3. Ticket status updates
                elif event == "TICKET_MUTATE":
                    await hub.broadcast_to_admins("TICKET_UPDATED", data)

                # 4. WebRTC Signaling (SDP Offer, Answer, ICE candidates for Remote Control)
                elif event in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE"]:
                    target_user_id = data.get("target_user_id")
                    await hub.send_to_user(target_user_id, event, data)

                # 5. Remote desktop input simulation commands (Mouse move, click, keydown)
                elif event == "REMOTE_INPUT_COMMAND":
                    target_user_id = data.get("target_user_id")
                    if target_user_id:
                        await hub.send_to_user(target_user_id, "REMOTE_INPUT_DISPATCH", data)
                    else:
                        await hub.broadcast_all("REMOTE_INPUT_DISPATCH", data)

                # 6. Real-time Screen Frame Relay (Employee -> Admin)
                elif event == "REMOTE_SCREEN_FRAME":
                    target_admin_id = data.get("target_admin_id")
                    if target_admin_id:
                        await hub.send_to_user(target_admin_id, "REMOTE_SCREEN_FRAME", data)
                    await hub.broadcast_to_admins("REMOTE_SCREEN_FRAME", data)

                # 7. Remote Desktop Session Control & Stop events
                elif event in ["REMOTE_SESSION_RESPONSE", "REMOTE_DESK_STOP"]:
                    target_user_id = data.get("target_user_id") or data.get("admin_id") or data.get("target_admin_id")
                    if target_user_id:
                        await hub.send_to_user(target_user_id, event, data)
                    await hub.broadcast_all(event, data)

            except json.JSONDecodeError:
                logger.error("Malformed JSON received on WebSocket")
    except WebSocketDisconnect:
        hub.disconnect(websocket, user_id)

