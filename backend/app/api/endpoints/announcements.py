from datetime import datetime
from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Announcement, User
from app.schemas.schemas import AnnouncementCreate, AnnouncementResponse
from app.core.websocket_hub import hub

logger = logging.getLogger("Announcements")

router = APIRouter(prefix="/announcements", tags=["Company Announcements"])

@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db)):
    """Fetch active company broadcasts/announcements."""
    items = db.query(Announcement).filter(Announcement.is_active == True).order_by(Announcement.created_at.desc()).all()
    return [AnnouncementResponse.model_validate(a) for a in items]

@router.post("", response_model=AnnouncementResponse)
async def create_announcement(item: AnnouncementCreate, db: Session = Depends(get_db)):
    """Admin creates and broadcasts a new announcement across all employee desktops."""
    announcement = Announcement(
        title=item.title,
        message=item.message,
        priority=item.priority.upper(),
        created_by_id=item.created_by_id,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    logger.info(f"Company announcement broadcasted: '{announcement.title}'")
    res = AnnouncementResponse.model_validate(announcement)
    # Broadcast to all connected clients over WebSocket
    import json
    payload = json.dumps({"event": "BROADCAST_ANNOUNCEMENT", "data": res.model_dump(mode="json")})
    for uid, conns in hub.active_connections.items():
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                pass

    return res

@router.delete("/{announcement_id}")
def dismiss_announcement(announcement_id: int, db: Session = Depends(get_db)):
    """Deactivate an announcement."""
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    ann.is_active = False
    db.commit()
    return {"status": "dismissed", "id": announcement_id}

