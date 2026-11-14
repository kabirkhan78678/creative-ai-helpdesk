from datetime import datetime
from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Device, User
from app.schemas.schemas import DeviceResponse, DeviceCreate, TelemetryReport, DeviceAutoEnroll, RemoteActionRequest
from app.core.websocket_hub import hub

logger = logging.getLogger("Devices")

router = APIRouter(prefix="/devices", tags=["Devices & Telemetry"])

@router.get("", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return [DeviceResponse.model_validate(d) for d in devices]

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return DeviceResponse.model_validate(device)

@router.post("", response_model=DeviceResponse)
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.hostname == device_in.hostname).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this hostname already exists")
    
    device = Device(
        hostname=device_in.hostname,
        assigned_user_id=device_in.assigned_user_id,
        ip_address=device_in.ip_address,
        mac_address=device_in.mac_address,
        os_name=device_in.os_name,
        os_version=device_in.os_version,
        cpu_model=device_in.cpu_model,
        total_ram_gb=device_in.total_ram_gb,
        is_online=True,
        last_heartbeat=datetime.utcnow()
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return DeviceResponse.model_validate(device)

@router.post("/auto-enroll", response_model=DeviceResponse)
async def auto_enroll_device(info: DeviceAutoEnroll, request: Request, db: Session = Depends(get_db)):
    """Automatically registers or updates a PC Workstation upon login/launch, and binds to logged-in user."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    resolved_ip = info.ip_address
    if (not resolved_ip or resolved_ip in ["127.0.0.1", "localhost", "192.168.1.120"]) and client_ip not in ["127.0.0.1", "localhost"]:
        resolved_ip = client_ip

    device = db.query(Device).filter(
        (Device.mac_address == info.mac_address) | (Device.hostname == info.hostname)
    ).first()

    if not device:
        device = Device(
            hostname=info.hostname,
            ip_address=resolved_ip,
            mac_address=info.mac_address,
            os_name=info.os_name,
            os_version=info.os_version,
            cpu_model=info.cpu_model,
            total_ram_gb=info.total_ram_gb,
            used_ram_gb=info.used_ram_gb or 0.0,
            cpu_usage_pct=info.cpu_usage_pct or 0.0,
            storage_usage_pct=info.storage_usage_pct or 0.0,
            total_storage_gb=info.total_storage_gb or 256.0,
            used_storage_gb=info.used_storage_gb or 0.0,
            wifi_ssid=info.wifi_ssid,
            ping_ms=info.ping_ms or 15,
            has_usb_connected=info.has_usb_connected or False,
            usb_devices=info.usb_devices,
            is_online=True,
            last_heartbeat=datetime.utcnow()
        )
        db.add(device)
        db.commit()
        db.refresh(device)
    else:
        device.hostname = info.hostname
        device.mac_address = info.mac_address
        device.ip_address = resolved_ip
        device.os_name = info.os_name
        device.cpu_model = info.cpu_model
        device.total_ram_gb = info.total_ram_gb
        device.used_ram_gb = info.used_ram_gb or device.used_ram_gb
        device.cpu_usage_pct = info.cpu_usage_pct or device.cpu_usage_pct
        device.storage_usage_pct = info.storage_usage_pct or device.storage_usage_pct
        if info.total_storage_gb:
            device.total_storage_gb = info.total_storage_gb
        if info.used_storage_gb:
            device.used_storage_gb = info.used_storage_gb
        if info.wifi_ssid:
            device.wifi_ssid = info.wifi_ssid
        if info.ping_ms:
            device.ping_ms = info.ping_ms
        if info.has_usb_connected is not None:
            device.has_usb_connected = info.has_usb_connected
        if info.usb_devices:
            device.usb_devices = info.usb_devices
        device.is_online = True
        device.last_heartbeat = datetime.utcnow()

    if info.user_id:
        user = db.query(User).filter(User.id == info.user_id).first()
        if user:
            # Unbind any previous device assigned to this user
            db.query(Device).filter(Device.assigned_user_id == user.id, Device.id != device.id).update({"assigned_user_id": None})
            device.assigned_user_id = user.id

    db.commit()
    db.refresh(device)

    logger.info(f"Workstation enrolled: '{device.hostname}' ({device.ip_address}) bound to User ID: {device.assigned_user_id}")
    res = DeviceResponse.model_validate(device)
    await hub.broadcast_to_admins("DEVICE_ENROLLED", res.model_dump(mode="json"))
    return res

@router.post("/telemetry")
async def report_telemetry(report: TelemetryReport, db: Session = Depends(get_db)):
    """Receives periodic telemetry beat from background agent and broadcasts to Admins."""
    device = db.query(Device).filter(Device.hostname == report.hostname).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.cpu_usage_pct = report.cpu_usage_pct
    device.used_ram_gb = report.used_ram_gb
    if report.total_ram_gb:
        device.total_ram_gb = report.total_ram_gb
    if report.storage_usage_pct is not None:
        device.storage_usage_pct = report.storage_usage_pct
    if report.total_storage_gb is not None:
        device.total_storage_gb = report.total_storage_gb
    if report.used_storage_gb is not None:
        device.used_storage_gb = report.used_storage_gb
    if report.wifi_ssid:
        device.wifi_ssid = report.wifi_ssid
    if report.ping_ms:
        device.ping_ms = report.ping_ms
    if report.has_usb_connected is not None:
        device.has_usb_connected = report.has_usb_connected
    if report.usb_devices:
        device.usb_devices = report.usb_devices
    if report.ip_address:
        device.ip_address = report.ip_address
    device.is_online = report.is_online
    device.last_heartbeat = datetime.utcnow()

    db.commit()
    db.refresh(device)

    # Broadcast live telemetry update over WebSocket to all admin dashboards
    telemetry_payload = {
        "id": device.id,
        "hostname": device.hostname,
        "ip_address": device.ip_address,
        "cpu_usage_pct": device.cpu_usage_pct,
        "used_ram_gb": device.used_ram_gb,
        "total_ram_gb": device.total_ram_gb,
        "storage_usage_pct": device.storage_usage_pct,
        "total_storage_gb": device.total_storage_gb,
        "used_storage_gb": device.used_storage_gb,
        "wifi_ssid": device.wifi_ssid,
        "ping_ms": device.ping_ms,
        "has_usb_connected": device.has_usb_connected,
        "usb_devices": device.usb_devices,
        "is_online": device.is_online,
        "last_heartbeat": device.last_heartbeat.isoformat() if device.last_heartbeat else None
    }
    await hub.broadcast_to_admins("DEVICE_TELEMETRY_UPDATE", telemetry_payload)

    return {"status": "ok", "device_id": device.id}

@router.post("/action")
async def dispatch_remote_action(req: RemoteActionRequest):
    """Admin dispatches remote action (LOCK, RESTART, CLEAN_TEMP, FLUSH_DNS, KILL_PROCESS, GET_TASKLIST, etc.)"""
    # Relay over WebSocket to admin logs
    await hub.broadcast_to_admins("REMOTE_ACTION_LOG", {"action": req.action, "target": req.target_hostname})
    # Broadcast to all connected employee workstations so the matching hostname executes
    await hub.broadcast_all("REMOTE_ACTION_DISPATCH", req.model_dump())
    return {"status": "dispatched", "action": req.action, "target": req.target_hostname}

@router.post("/action-result")
async def report_action_result(payload: dict):
    """Employee client returns result of executed remote action or process list"""
    await hub.broadcast_to_admins("REMOTE_ACTION_RESULT", payload)
    return {"status": "ok"}

@router.put("/{device_id}/assign/{user_id}")
async def assign_device(device_id: int, user_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not device or not user:
        raise HTTPException(status_code=404, detail="Device or User not found")
    
    device.assigned_user_id = user.id
    db.commit()
    db.refresh(device)

    await hub.broadcast_to_admins("DEVICE_UPDATED", DeviceResponse.model_validate(device).model_dump(mode="json"))
    return DeviceResponse.model_validate(device)

