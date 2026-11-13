import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Ticket, User, Device
from app.schemas.schemas import TicketResponse, TicketCreate, TicketUpdate
from app.core.websocket_hub import hub

router = APIRouter(prefix="/tickets", tags=["Helpdesk & Tickets"])

def generate_ticket_number(db: Session) -> str:
    count = db.query(Ticket).count() + 1
    return f"TCK-{datetime.utcnow().year}-{count:04d}"

@router.get("", response_model=List[TicketResponse])
def get_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status.upper())
    if priority:
        query = query.filter(Ticket.priority == priority.upper())
    
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return [TicketResponse.model_validate(t) for t in tickets]

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return TicketResponse.model_validate(ticket)

@router.post("", response_model=TicketResponse)
async def create_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db)):
    creator = db.query(User).filter(User.id == ticket_in.creator_id).first()
    if not creator:
        raise HTTPException(status_code=400, detail="Invalid creator_id")

    ticket = Ticket(
        ticket_uuid=str(uuid.uuid4()),
        ticket_number=generate_ticket_number(db),
        title=ticket_in.title,
        description=ticket_in.description,
        category=ticket_in.category.upper(),
        priority=ticket_in.priority.upper(),
        status="PENDING",
        creator_id=ticket_in.creator_id,
        device_id=ticket_in.device_id,
        attachment_image=ticket_in.attachment_image,
        created_at=datetime.utcnow()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    res = TicketResponse.model_validate(ticket)
    # Broadcast ticket creation live to all IT admins
    await hub.broadcast_to_admins("TICKET_CREATED", res.model_dump(mode="json"))
    return res

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: int, ticket_up: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket_up.title is not None:
        ticket.title = ticket_up.title
    if ticket_up.description is not None:
        ticket.description = ticket_up.description
    if ticket_up.status is not None:
        ticket.status = ticket_up.status.upper()
        if ticket.status == "RESOLVED":
            ticket.resolved_at = datetime.utcnow()
    if ticket_up.priority is not None:
        ticket.priority = ticket_up.priority.upper()
    if ticket_up.assigned_tech_id is not None:
        ticket.assigned_tech_id = ticket_up.assigned_tech_id

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    res = TicketResponse.model_validate(ticket)
    # Broadcast to admins and to ticket creator
    data = res.model_dump(mode="json")
    await hub.broadcast_to_admins("TICKET_UPDATED", data)
    await hub.send_to_user(ticket.creator_id, "TICKET_UPDATED", data)

    return res

