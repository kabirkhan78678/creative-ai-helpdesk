from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    employee_code: str
    full_name: str
    email: str
    role: str = "EMPLOYEE"
    department: str
    designation: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class PasswordReset(BaseModel):
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Device & Telemetry Schemas ---
class DeviceBase(BaseModel):
    hostname: str
    ip_address: str
    mac_address: str
    os_name: str
    os_version: str
    cpu_model: str
    total_ram_gb: float

class DeviceCreate(DeviceBase):
    assigned_user_id: Optional[int] = None

class DeviceAutoEnroll(BaseModel):
    hostname: str
    ip_address: str
    mac_address: str
    os_name: str
    os_version: str
    cpu_model: str
    total_ram_gb: float
    used_ram_gb: Optional[float] = 0.0
    cpu_usage_pct: Optional[float] = 0.0
    storage_usage_pct: Optional[float] = 0.0
    total_storage_gb: Optional[float] = 256.0
    used_storage_gb: Optional[float] = 0.0
    wifi_ssid: Optional[str] = None
    ping_ms: Optional[int] = 15
    has_usb_connected: Optional[bool] = False
    usb_devices: Optional[str] = None
    user_id: Optional[int] = None

class TelemetryReport(BaseModel):
    hostname: str
    ip_address: Optional[str] = None
    cpu_usage_pct: float
    used_ram_gb: float
    total_ram_gb: Optional[float] = None
    storage_usage_pct: Optional[float] = None
    total_storage_gb: Optional[float] = None
    used_storage_gb: Optional[float] = None
    wifi_ssid: Optional[str] = None
    ping_ms: Optional[int] = 15
    has_usb_connected: Optional[bool] = False
    usb_devices: Optional[str] = None
    is_online: bool = True

class DeviceResponse(DeviceBase):
    id: int
    assigned_user_id: Optional[int] = None
    assigned_user: Optional[UserResponse] = None
    used_ram_gb: float
    cpu_usage_pct: float
    storage_usage_pct: float
    total_storage_gb: Optional[float] = 256.0
    used_storage_gb: Optional[float] = 0.0
    wifi_ssid: Optional[str] = None
    ping_ms: Optional[int] = 15
    has_usb_connected: Optional[bool] = False
    usb_devices: Optional[str] = None
    is_online: bool
    last_heartbeat: Optional[datetime] = None
    agent_version: str

    class Config:
        from_attributes = True

# --- Ticket Schemas ---
class TicketBase(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "MEDIUM"
    attachment_image: Optional[str] = None

class TicketCreate(TicketBase):
    creator_id: int
    device_id: Optional[int] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_tech_id: Optional[int] = None

class TicketResponse(TicketBase):
    id: int
    ticket_uuid: str
    ticket_number: str
    status: str
    creator_id: int
    assigned_tech_id: Optional[int] = None
    device_id: Optional[int] = None
    creator: Optional[UserResponse] = None
    assigned_tech: Optional[UserResponse] = None
    device: Optional[DeviceResponse] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    attachment_image: Optional[str] = None

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    sender_id: int
    recipient_id: int
    message_body: str
    ticket_id: Optional[int] = None

class ChatMessageResponse(BaseModel):
    id: int
    ticket_id: Optional[int] = None
    sender_id: int
    recipient_id: int
    message_body: str
    is_read: bool
    created_at: Optional[datetime] = None
    sender: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Remote Desktop Session Schemas ---
class RemoteSessionCreate(BaseModel):
    admin_id: int
    employee_id: int
    device_id: int
    ticket_id: Optional[int] = None

class RemoteSessionResponse(BaseModel):
    id: int
    session_code: str
    ticket_id: Optional[int] = None
    admin_id: int
    employee_id: int
    device_id: int
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Announcement Schemas ---
class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "INFO" # INFO, WARNING, CRITICAL
    created_by_id: Optional[int] = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    priority: str
    created_by_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None
    created_by: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Remote Action & Process Schemas ---
class RemoteActionRequest(BaseModel):
    action: str # LOCK, RESTART, CLEAN_TEMP, FLUSH_DNS, KILL_PROCESS, GET_TASKLIST, GET_INSTALLED_APPS
    target_hostname: str
    target_device_id: Optional[int] = None
    target_pid: Optional[int] = None


