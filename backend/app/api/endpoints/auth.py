import hashlib
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User, Device, Ticket, ChatMessage, RemoteSession, Announcement
from app.schemas.schemas import UserLogin, TokenResponse, UserResponse, UserCreate, PasswordReset, ProfileUpdate

logger = logging.getLogger("Auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.get("/health")
def health_check():
    return {"status": "ONLINE", "service": "creative-ai-backend"}

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    identifier = credentials.username_or_email.strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.employee_code == identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")
    
    if user.password_hash != hash_password(credentials.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact Admin.")

    token = f"bearer_{user.id}_{user.role.lower()}_session"
    logger.info(f"User login successful: {user.full_name} ({user.email}) [Role: {user.role}]")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Admin creates employee credentials (Username/Code, Email, Password, Department, Role)."""
    existing = db.query(User).filter(
        (User.email == user_in.email) | (User.employee_code == user_in.employee_code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code/username or email already registered")

    new_user = User(
        employee_code=user_in.employee_code.strip(),
        full_name=user_in.full_name.strip(),
        email=user_in.email.strip(),
        password_hash=hash_password(user_in.password),
        role=user_in.role.upper(),
        department=user_in.department.strip(),
        designation=user_in.designation.strip() if user_in.designation else None,
        avatar_url=user_in.avatar_url,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"New user registered: {new_user.full_name} (Code: {new_user.employee_code}, Role: {new_user.role})")
    return UserResponse.model_validate(new_user)

@router.get("/users", response_model=list[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.asc()).all()
    return [UserResponse.model_validate(u) for u in users]

@router.put("/users/{user_id}/profile", response_model=UserResponse)
def update_profile(user_id: int, profile: ProfileUpdate, db: Session = Depends(get_db)):
    """Allows updating an employee's Name, Department, and Designation."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if profile.full_name is not None and profile.full_name.strip():
        user.full_name = profile.full_name.strip()
    if profile.department is not None and profile.department.strip():
        user.department = profile.department.strip()
    if profile.designation is not None and profile.designation.strip():
        user.designation = profile.designation.strip()
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.put("/users/{user_id}/reset-password")
def reset_password(user_id: int, reset: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(reset.new_password)
    db.commit()
    return {"status": "ok", "message": f"Password updated for {user.full_name}"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role.upper() == "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete primary Admin account")
    
    try:
        user_name = user.full_name

        # 1. Unassign all physical workstations linked to this employee
        db.query(Device).filter(Device.assigned_user_id == user_id).update(
            {Device.assigned_user_id: None},
            synchronize_session=False
        )

        # 2. Delete remote control sessions involving this employee
        db.query(RemoteSession).filter(
            (RemoteSession.employee_id == user_id) | (RemoteSession.admin_id == user_id)
        ).delete(synchronize_session=False)

        # 3. Delete direct chat messages involving this employee
        db.query(ChatMessage).filter(
            (ChatMessage.sender_id == user_id) | (ChatMessage.recipient_id == user_id)
        ).delete(synchronize_session=False)

        # 4. Handle tickets: unassign if technician
        db.query(Ticket).filter(Ticket.assigned_tech_id == user_id).update(
            {Ticket.assigned_tech_id: None},
            synchronize_session=False
        )

        # 5. Delete tickets created by this employee (including linked chat messages)
        created_tickets = db.query(Ticket).filter(Ticket.creator_id == user_id).all()
        for t in created_tickets:
            db.query(ChatMessage).filter(ChatMessage.ticket_id == t.id).delete(synchronize_session=False)
            db.delete(t)

        # 6. Nullify announcements authored by this employee
        db.query(Announcement).filter(Announcement.created_by_id == user_id).update(
            {Announcement.created_by_id: None},
            synchronize_session=False
        )

        # 7. Delete the user account
        db.delete(user)
        db.commit()
        logger.info(f"User #{user_id} ({user_name}) deleted and dependencies cleaned up successfully.")
        return {"status": "ok", "message": f"User {user_name} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete employee: {str(e)}")
