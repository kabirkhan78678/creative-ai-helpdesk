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
from app.models.entities import User, Device, Ticket, RemoteSession, ChatMessage
from datetime import datetime
import secrets

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

                # 1. Real-time Chat relay & DB persistence
                if event == "CHAT_SEND":
                    target_id = data.get("recipient_id")
                    db = SessionLocal()
                    try:
                        msg = ChatMessage(
                            ticket_id=data.get("ticket_id"),
                            sender_id=data.get("sender_id", user_id),
                            recipient_id=target_id,
                            message_body=data.get("message_body", data.get("text", "")),
                            created_at=datetime.utcnow()
                        )
                        db.add(msg)
                        db.commit()
                        db.refresh(msg)
                        data["id"] = msg.id
                        data["created_at"] = msg.created_at.isoformat()
                    except Exception as e:
                        logger.error(f"Chat persistence error: {e}")
                    finally:
                        db.close()
                    if target_id:
                        await hub.send_to_user(target_id, "CHAT_MESSAGE", data)
                    await hub.send_to_user(user_id, "CHAT_MESSAGE", data)

                # 2. Live Telemetry stream from agent (Pure WebSocket - NO HTTP hits)
                elif event == "TELEMETRY_STREAM":
                    hostname = data.get("hostname")
                    if hostname:
                        db = SessionLocal()
                        try:
                            dev = db.query(Device).filter(Device.hostname == hostname).first()
                            if dev:
                                dev.cpu_usage_pct = data.get("cpu_usage_pct", dev.cpu_usage_pct)
                                dev.used_ram_gb = data.get("used_ram_gb", dev.used_ram_gb)
                                if data.get("total_ram_gb"):
                                    dev.total_ram_gb = data["total_ram_gb"]
                                if data.get("storage_usage_pct") is not None:
                                    dev.storage_usage_pct = data["storage_usage_pct"]
                                if data.get("total_storage_gb") is not None:
                                    dev.total_storage_gb = data["total_storage_gb"]
                                if data.get("used_storage_gb") is not None:
                                    dev.used_storage_gb = data["used_storage_gb"]
                                if data.get("wifi_ssid"):
                                    dev.wifi_ssid = data["wifi_ssid"]
                                if data.get("ping_ms"):
                                    dev.ping_ms = data["ping_ms"]
                                if data.get("has_usb_connected") is not None:
                                    dev.has_usb_connected = data["has_usb_connected"]
                                if data.get("usb_devices"):
                                    dev.usb_devices = data["usb_devices"]
                                if data.get("ip_address"):
                                    dev.ip_address = data["ip_address"]
                                dev.is_online = True
                                dev.last_heartbeat = datetime.utcnow()
                                db.commit()
                                db.refresh(dev)
                                data["id"] = dev.id
                        except Exception as e:
                            logger.error(f"Telemetry DB update error: {e}")
                        finally:
                            db.close()
                    await hub.broadcast_to_admins("DEVICE_TELEMETRY_UPDATE", data)

                # 3. Remote Action Request (Admin -> Workstation via WebSocket)
                elif event == "REMOTE_ACTION_REQUEST":
                    target_user_id = data.get("target_user_id")
                    if target_user_id:
                        await hub.send_to_user(target_user_id, "REMOTE_ACTION_DISPATCH", data)
                    await hub.broadcast_all("REMOTE_ACTION_DISPATCH", data)

                # 4. Remote Action Result (Workstation -> Admin via WebSocket)
                elif event == "REMOTE_ACTION_RESULT":
                    await hub.broadcast_to_admins("REMOTE_ACTION_RESULT_NOTIFY", data)

                # 5. Remote Session Initiate (Admin -> Workstation via WebSocket)
                elif event == "REMOTE_SESSION_INITIATE":
                    db = SessionLocal()
                    try:
                        admin_id = data.get("admin_id", user_id)
                        employee_id = data.get("employee_id", 0)
                        device_id = data.get("device_id")
                        dev = db.query(Device).filter(Device.id == device_id).first() if device_id else None
                        hostname = dev.hostname if dev else data.get("target_hostname", "Workstation")
                        admin = db.query(User).filter(User.id == admin_id).first()
                        admin_name = admin.full_name if admin else "IT Administrator"
                        code = f"REM-{secrets.token_hex(4).upper()}"

                        session = RemoteSession(
                            session_code=code,
                            ticket_id=data.get("ticket_id"),
                            admin_id=admin_id,
                            employee_id=employee_id,
                            device_id=device_id or 1,
                            status="REQUESTED",
                            created_at=datetime.utcnow()
                        )
                        db.add(session)
                        db.commit()
                        db.refresh(session)

                        prompt_payload = {
                            "session_code": code,
                            "session_id": session.id,
                            "admin_id": admin_id,
                            "admin_name": admin_name,
                            "device_id": device_id,
                            "target_hostname": hostname,
                            "ticket_id": data.get("ticket_id")
                        }
                        # Notify initiating admin with session info & code
                        await hub.send_to_user(admin_id, "REMOTE_SESSION_CREATED", prompt_payload)
                        # Notify target employee
                        if employee_id:
                            await hub.send_to_user(employee_id, "REMOTE_SESSION_PROMPT", prompt_payload)
                        await hub.broadcast_all("REMOTE_SESSION_PROMPT", prompt_payload)
                    except Exception as e:
                        logger.error(f"Remote initiate error: {e}")
                    finally:
                        db.close()

                # 6. Remote Session Response (Employee -> Admin via WebSocket)
                elif event == "REMOTE_SESSION_RESPONSE":
                    session_id = data.get("session_id")
                    approved = data.get("approved", False)
                    admin_target = data.get("target_admin_id")
                    if session_id:
                        db = SessionLocal()
                        try:
                            sess = db.query(RemoteSession).filter(RemoteSession.id == session_id).first()
                            if sess:
                                sess.status = "ACTIVE" if approved else "DENIED"
                                if approved:
                                    sess.started_at = datetime.utcnow()
                                else:
                                    sess.ended_at = datetime.utcnow()
                                db.commit()
                                admin_target = sess.admin_id
                        except Exception as e:
                            logger.error(f"Remote response error: {e}")
                        finally:
                            db.close()
                    if admin_target:
                        await hub.send_to_user(admin_target, "REMOTE_SESSION_RESPONSE", data)
                    await hub.broadcast_to_admins("REMOTE_SESSION_RESPONSE", data)

                # 7. Ticket status updates
                elif event == "TICKET_MUTATE":
                    await hub.broadcast_to_admins("TICKET_UPDATED", data)

                # 8. WebRTC Signaling (SDP Offer, Answer, ICE candidates for Remote Control)
                elif event in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE"]:
                    target_user_id = data.get("target_user_id")
                    await hub.send_to_user(target_user_id, event, data)

                # 9. Remote desktop input simulation commands (Mouse move, click, keydown)
                elif event == "REMOTE_INPUT_COMMAND":
                    target_user_id = data.get("target_user_id")
                    if target_user_id:
                        await hub.send_to_user(target_user_id, "REMOTE_INPUT_DISPATCH", data)
                    else:
                        await hub.broadcast_all("REMOTE_INPUT_DISPATCH", data)

                # 10. Real-time Screen Frame Relay (Employee -> Admin)
                elif event == "REMOTE_SCREEN_FRAME":
                    target_admin_id = data.get("target_admin_id")
                    if target_admin_id:
                        await hub.send_to_user(target_admin_id, "REMOTE_SCREEN_FRAME", data)
                    else:
                        await hub.broadcast_to_admins("REMOTE_SCREEN_FRAME", data)

                # 11. Remote Desktop Stop event
                elif event == "REMOTE_DESK_STOP":
                    session_id = data.get("session_id")
                    if session_id:
                        db = SessionLocal()
                        try:
                            sess = db.query(RemoteSession).filter(RemoteSession.id == session_id).first()
                            if sess:
                                sess.status = "ENDED"
                                sess.ended_at = datetime.utcnow()
                                db.commit()
                        except Exception:
                            pass
                        finally:
                            db.close()
                    target_user_id = data.get("target_user_id") or data.get("admin_id") or data.get("target_admin_id")
                    if target_user_id:
                        await hub.send_to_user(target_user_id, "REMOTE_DESK_STOP", data)
                    await hub.broadcast_all("REMOTE_DESK_STOP", data)

            except json.JSONDecodeError:
                logger.error("Malformed JSON received on WebSocket")
    except WebSocketDisconnect:
        hub.disconnect(websocket, user_id)

