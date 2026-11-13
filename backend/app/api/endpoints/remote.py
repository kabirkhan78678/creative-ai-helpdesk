import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import RemoteSession, Device, User
from app.schemas.schemas import RemoteSessionCreate, RemoteSessionResponse
from app.core.websocket_hub import hub

router = APIRouter(prefix="/remote", tags=["Remote Access"])

@router.post("/request", response_model=RemoteSessionResponse)
async def request_remote_session(req: RemoteSessionCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == req.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Target device not found")

    session_code = f"REM-{secrets.token_hex(4).upper()}"
    admin = db.query(User).filter(User.id == req.admin_id).first()
    admin_name = admin.full_name if admin else "IT Administrator"

    session = RemoteSession(
        session_code=session_code,
        ticket_id=req.ticket_id,
        admin_id=req.admin_id,
        employee_id=req.employee_id,
        device_id=req.device_id,
        status="REQUESTED",
        created_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    res = RemoteSessionResponse.model_validate(session)
    
    prompt_payload = {
        "session_code": session_code,
        "session_id": session.id,
        "admin_id": req.admin_id,
        "admin_name": admin_name,
        "device_id": req.device_id,
        "target_hostname": device.hostname,
        "ticket_id": req.ticket_id
    }

    # Notify target employee desktop app via WebSocket
    if req.employee_id:
        await hub.send_to_user(req.employee_id, "REMOTE_SESSION_PROMPT", prompt_payload)
    await hub.broadcast_all("REMOTE_SESSION_PROMPT", prompt_payload)

    return res

@router.post("/{session_id}/respond")
async def respond_to_remote_session(
    session_id: int, 
    approved: bool, 
    db: Session = Depends(get_db)
):
    session = db.query(RemoteSession).filter(RemoteSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if approved:
        session.status = "ACTIVE"
        session.started_at = datetime.utcnow()
    else:
        session.status = "DENIED"
        session.ended_at = datetime.utcnow()

    db.commit()
    db.refresh(session)

    payload = {
        "session_id": session.id,
        "session_code": session.session_code,
        "status": session.status,
        "approved": approved
    }
    # Send resolution to admin
    await hub.send_to_user(session.admin_id, "REMOTE_SESSION_RESPONSE", payload)
    return payload

@router.post("/{session_id}/terminate")
async def terminate_remote_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(RemoteSession).filter(RemoteSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "ENDED"
    session.ended_at = datetime.utcnow()
    db.commit()

    payload = {"session_id": session.id, "session_code": session.session_code}
    await hub.send_to_user(session.admin_id, "REMOTE_SESSION_ENDED", payload)
    await hub.send_to_user(session.employee_id, "REMOTE_SESSION_ENDED", payload)
    return {"status": "terminated"}

