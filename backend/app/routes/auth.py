import re
import os
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
import bcrypt
from google.oauth2 import id_token
from google.auth.transport import requests
from app.database import get_db
from app.models import User, Role
from app.schemas import SignupRequest, LoginRequest, OAuthRequest, UpdatePasswordRequest
from app.auth_utils import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "646918547768-nmn9k1bai4lcmsvtq5u58p6onokulqcu.apps.googleusercontent.com")

# Academic Email regex validation: must end in .edu or .edu.in
ACADEMIC_EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu(\.in)?$", re.IGNORECASE)

# Helper to hash password
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

# Helper to verify password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "class_id": user.class_id,
        "batch": user.batch,
        "class": {
            "id": user.class_.id,
            "class_code": user.class_.class_code,
            "stream": user.class_.stream,
            "academic_year": user.class_.academic_year,
            "division": user.class_.division,
            "timetable": [
                {
                    "id": s.id,
                    "class_id": s.class_id,
                    "day_of_week": s.day_of_week,
                    "subject_name": s.subject_name,
                    "start_time": s.start_time,
                    "end_time": s.end_time
                } for s in user.class_.timetable
            ]
        } if user.class_ else None
    }

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password
    
    if not name or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields (name, email, password) are required."
        )
        
    # Email domain check
    if not ACADEMIC_EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed: You must use an academic email domain ending in .edu or .edu.in"
        )
        
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration failed: Email already in use."
        )
        
    password_hash = get_password_hash(password)
    new_user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role=Role.STUDENT,
        class_id=None
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "Registration successful.",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role.value
        }
    }

@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required."
        )
        
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password."
        )
        
    jwt_token = create_access_token({"userId": user.id, "role": user.role.value})
    
    # Set cookie (use samesite=none and secure=True in prod for Vercel/Render cross-origin session support)
    is_prod = os.getenv("NODE_ENV") == "production"
    samesite_val = "none" if is_prod else "lax"
    secure_val = True if is_prod else False
    
    response.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        max_age=365 * 24 * 60 * 60, # 365 days
        samesite=samesite_val,
        secure=secure_val
    )
    
    return {
        "message": "Login successful.",
        "user": serialize_user(user)
    }

@router.post("/google")
def google_auth(payload: OAuthRequest, response: Response, db: Session = Depends(get_db)):
    token = payload.token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required."
        )
        
    try:
        # Verify the Google Token
        id_info = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        email = id_info.get("email", "").strip().lower()
        name = id_info.get("name", "").strip()
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account has no associated email."
            )
            
        # Verify domain strictly ends with @despu.edu.in
        if not email.endswith("@despu.edu.in"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only @despu.edu.in email addresses are permitted."
            )
            
        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name or "Google Student",
                email=email,
                password_hash="OAUTH_USER",
                role=Role.STUDENT,
                class_id=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        jwt_token = create_access_token({"userId": user.id, "role": user.role.value})
        
        is_prod = os.getenv("NODE_ENV") == "production"
        samesite_val = "none" if is_prod else "lax"
        secure_val = True if is_prod else False
        
        response.set_cookie(
            key="token",
            value=jwt_token,
            httponly=True,
            max_age=365 * 24 * 60 * 60,
            samesite=samesite_val,
            secure=secure_val
        )
        
        return {
            "message": "Login successful.",
            "user": serialize_user(user)
        }
        
    except ValueError as e:
        print("Google Auth token verification error:", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Invalid Google token."
        )

@router.post("/logout")
def logout(response: Response):
    is_prod = os.getenv("NODE_ENV") == "production"
    samesite_val = "none" if is_prod else "lax"
    secure_val = True if is_prod else False
    response.delete_cookie(key="token", samesite=samesite_val, secure=secure_val, httponly=True)
    return {"message": "Logged out successfully."}

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "user": serialize_user(user)
    }

@router.post("/password")
def update_password(payload: UpdatePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        new_password = payload.password.strip()
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
        pwd_bytes = new_password.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
        
        current_user.password_hash = password_hash
        db.commit()
        return {"message": "Password updated successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print("Update password error:", e)
        raise HTTPException(status_code=500, detail="Failed to update password.")
