import hashlib
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.entities import User, Device, Ticket, ChatMessage

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

def populate_seed_data(db: Session):
    print("-> Seeding Users...")
    users = [
        User(
            employee_code="ADM-001",
            full_name="Marcus Vance",
            email="admin@company.com",
            password_hash=hash_pw("admin123"),
            role="ADMIN",
            department="IT Infrastructure",
            designation="Principal Systems Architect"
        ),
        User(
            employee_code="TCH-001",
            full_name="Elena Rostova",
            email="tech@company.com",
            password_hash=hash_pw("tech123"),
            role="TECHNICIAN",
            department="IT Support",
            designation="Lead IT Engineer"
        ),
        User(
            employee_code="EMP-101",
            full_name="Sarah Connor",
            email="sarah.c@company.com",
            password_hash=hash_pw("user123"),
            role="EMPLOYEE",
            department="Product Design",
            designation="Senior UI/UX Designer"
        ),
        User(
            employee_code="EMP-102",
            full_name="Alex Mercer",
            email="alex.m@company.com",
            password_hash=hash_pw("user123"),
            role="EMPLOYEE",
            department="Core Engineering",
            designation="Senior Backend Engineer"
        ),
        User(
            employee_code="EMP-103",
            full_name="David Miller",
            email="david.m@company.com",
            password_hash=hash_pw("user123"),
            role="EMPLOYEE",
            department="Enterprise Sales",
            designation="Account Executive"
        ),
        User(
            employee_code="EMP-104",
            full_name="Priya Sharma",
            email="priya.s@company.com",
            password_hash=hash_pw("user123"),
            role="EMPLOYEE",
            department="Finance & Operations",
            designation="Financial Analyst"
        )
    ]
    for u in users:
        db.add(u)
    db.commit()

    print("-> Seeding Hardware Fleet (Devices)...")
    devices = [
        Device(
            hostname="WS-DEV-12",
            assigned_user_id=4, # Alex Mercer
            ip_address="192.168.1.112",
            mac_address="A0:36:BC:54:33:E1",
            os_name="Ubuntu 24.04 LTS",
            os_version="Kernel 6.8.0-generic",
            cpu_model="AMD Ryzen 9 7950X (16 cores)",
            total_ram_gb=64.0,
            used_ram_gb=48.2,
            cpu_usage_pct=74.5,
            storage_usage_pct=62.0,
            is_online=True,
            last_heartbeat=datetime.utcnow()
        ),
        Device(
            hostname="WS-DESIGN-04",
            assigned_user_id=3, # Sarah Connor
            ip_address="192.168.1.104",
            mac_address="D4:5D:64:88:1A:F2",
            os_name="Windows 11 Pro",
            os_version="Build 22631.3296",
            cpu_model="Intel Core i9-13900K (24 cores)",
            total_ram_gb=32.0,
            used_ram_gb=24.8,
            cpu_usage_pct=42.0,
            storage_usage_pct=54.0,
            is_online=True,
            last_heartbeat=datetime.utcnow()
        ),
        Device(
            hostname="WS-SALES-09",
            assigned_user_id=5, # David Miller
            ip_address="192.168.1.139",
            mac_address="3C:7C:3F:92:40:AA",
            os_name="macOS Sonoma",
            os_version="14.4.1",
            cpu_model="Apple M3 Max (16 cores)",
            total_ram_gb=36.0,
            used_ram_gb=14.2,
            cpu_usage_pct=18.0,
            storage_usage_pct=38.0,
            is_online=False,
            last_heartbeat=datetime.utcnow() - timedelta(minutes=45)
        ),
        Device(
            hostname="WS-FIN-02",
            assigned_user_id=6, # Priya Sharma
            ip_address="192.168.1.155",
            mac_address="58:11:22:99:3B:18",
            os_name="Windows 11 Enterprise",
            os_version="Build 22631.3155",
            cpu_model="Intel Core i7-13700",
            total_ram_gb=16.0,
            used_ram_gb=8.6,
            cpu_usage_pct=26.4,
            storage_usage_pct=41.2,
            is_online=True,
            last_heartbeat=datetime.utcnow()
        )
    ]
    for d in devices:
        db.add(d)
    db.commit()

    print("-> Seeding Helpdesk Tickets...")
    tickets = [
        Ticket(
            ticket_uuid=str(uuid.uuid4()),
            ticket_number="TCK-2026-0001",
            title="Gateway VPN Connection Timeout on Docker subnet",
            description="Since this morning, docker compose bridge network conflicts with the company wireguard tunnel, terminating SSH connections.",
            category="NETWORK",
            priority="CRITICAL",
            status="IN_PROGRESS",
            creator_id=4, # Alex Mercer
            assigned_tech_id=2, # Elena Rostova
            device_id=1,
            created_at=datetime.utcnow() - timedelta(hours=2)
        ),
        Ticket(
            ticket_uuid=str(uuid.uuid4()),
            ticket_number="TCK-2026-0002",
            title="GPU Driver Crash during 3D Render Export in Blender",
            description="NVIDIA driver 551.76 throws error code 43 when rendering cycles viewport with OptiX enabled.",
            category="HARDWARE",
            priority="HIGH",
            status="PENDING",
            creator_id=3, # Sarah Connor
            assigned_tech_id=None,
            device_id=2,
            created_at=datetime.utcnow() - timedelta(minutes=40)
        ),
        Ticket(
            ticket_uuid=str(uuid.uuid4()),
            ticket_number="TCK-2026-0003",
            title="Request for Snowflake DB read-replica access",
            description="Need read access to the analytics_prod schema for Q4 revenue reconciliation modeling.",
            category="ACCESS",
            priority="MEDIUM",
            status="RESOLVED",
            creator_id=6, # Priya Sharma
            assigned_tech_id=1, # Marcus Vance
            device_id=4,
            created_at=datetime.utcnow() - timedelta(days=1),
            resolved_at=datetime.utcnow() - timedelta(hours=3)
        )
    ]
    for t in tickets:
        db.add(t)
    db.commit()

    print("-> Seeding Live Chat Messages...")
    chats = [
        ChatMessage(
            ticket_id=1,
            sender_id=4, # Alex Mercer
            recipient_id=1, # Admin Marcus
            message_body="Hey Marcus, can you remote into WS-DEV-12 and inspect the iptables route tables?",
            is_read=True,
            created_at=datetime.utcnow() - timedelta(hours=1, minutes=45)
        ),
        ChatMessage(
            ticket_id=1,
            sender_id=1, # Admin Marcus
            recipient_id=4, # Alex Mercer
            message_body="Sure thing Alex. Please accept the remote connection prompt on your screen.",
            is_read=True,
            created_at=datetime.utcnow() - timedelta(hours=1, minutes=40)
        )
    ]
    for c in chats:
        db.add(c)
    db.commit()
    print("✓ Seeding completed successfully.")

if __name__ == "__main__":
    from app.db.session import engine, Base, SessionLocal
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    populate_seed_data(db)
    db.close()

