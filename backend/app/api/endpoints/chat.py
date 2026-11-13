from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import ChatMessage, User
from app.schemas.schemas import ChatMessageResponse, ChatMessageCreate
from app.core.websocket_hub import hub

router = APIRouter(prefix="/chat", tags=["Live Chat"])

@router.get("/conversation", response_model=List[ChatMessageResponse])
def get_conversation(
    user_a: int = Query(...),
    user_b: int = Query(...),
    ticket_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == user_a) & (ChatMessage.recipient_id == user_b)) |
        ((ChatMessage.sender_id == user_b) & (ChatMessage.recipient_id == user_a))
    )
    if ticket_id:
        query = query.filter(ChatMessage.ticket_id == ticket_id)

    messages = query.order_by(ChatMessage.created_at.asc()).all()
    return [ChatMessageResponse.model_validate(m) for m in messages]

@router.post("/send", response_model=ChatMessageResponse)
async def send_chat_message(msg_in: ChatMessageCreate, db: Session = Depends(get_db)):
    msg = ChatMessage(
        ticket_id=msg_in.ticket_id,
        sender_id=msg_in.sender_id,
        recipient_id=msg_in.recipient_id,
        message_body=msg_in.message_body,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    response = ChatMessageResponse.model_validate(msg)
    data = response.model_dump(mode="json")

    # Real-time WebSocket dispatch to recipient and back to sender's other windows
    await hub.send_to_user(msg_in.recipient_id, "CHAT_MESSAGE", data)
    await hub.send_to_user(msg_in.sender_id, "CHAT_MESSAGE_SENT", data)

    return response

