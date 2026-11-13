from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, 
    DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_code = Column(String(32), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="EMPLOYEE", nullable=False) # ADMIN, TECHNICIAN, EMPLOYEE
    department = Column(String(80), nullable=False)
    designation = Column(String(80), nullable=True)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    devices = relationship("Device", back_populates="assigned_user")
    tickets_created = relationship("Ticket", foreign_keys="[Ticket.creator_id]", back_populates="creator")
    tickets_assigned = relationship("Ticket", foreign_keys="[Ticket.assigned_tech_id]", back_populates="assigned_tech")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hostname = Column(String(128), unique=True, nullable=False, index=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(45), nullable=False)
    mac_address = Column(String(20), unique=True, nullable=False)
    os_name = Column(String(64), nullable=False)
    os_version = Column(String(64), nullable=False)
    cpu_model = Column(String(128), nullable=False)
    total_ram_gb = Column(Float, nullable=False, default=16.0)
    used_ram_gb = Column(Float, default=0.0)
    cpu_usage_pct = Column(Float, default=0.0)
    storage_usage_pct = Column(Float, default=0.0)
    total_storage_gb = Column(Float, default=256.0)
    used_storage_gb = Column(Float, default=0.0)
    wifi_ssid = Column(String(128), nullable=True)
    ping_ms = Column(Integer, default=15)
    has_usb_connected = Column(Boolean, default=False)
    usb_devices = Column(String(255), nullable=True)
    is_online = Column(Boolean, default=False, index=True)
    last_heartbeat = Column(DateTime, nullable=True)
    agent_version = Column(String(20), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_user = relationship("User", back_populates="devices")
    tickets = relationship("Ticket", back_populates="device")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_uuid = Column(String(36), unique=True, nullable=False, index=True)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True) # e.g. TCK-1001
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False) # HARDWARE, NETWORK, SOFTWARE, ACCESS, OTHER
    priority = Column(String(20), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, IN_PROGRESS, RESOLVED, CLOSED
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_tech_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    attachment_image = Column(Text, nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="tickets_created")
    assigned_tech = relationship("User", foreign_keys=[assigned_tech_id], back_populates="tickets_assigned")
    device = relationship("Device", back_populates="tickets")
    messages = relationship("ChatMessage", back_populates="ticket", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])

class RemoteSession(Base):
    __tablename__ = "remote_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_code = Column(String(32), unique=True, nullable=False, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    status = Column(String(20), default="REQUESTED") # REQUESTED, APPROVED, ACTIVE, DENIED, ENDED
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="INFO") # INFO, WARNING, CRITICAL
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_by = relationship("User")
