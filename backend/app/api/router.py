from fastapi import APIRouter
from app.api.endpoints import auth, devices, tickets, chat, remote, announcements

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(devices.router)
api_router.include_router(tickets.router)
api_router.include_router(chat.router)
api_router.include_router(remote.router)
api_router.include_router(announcements.router)
