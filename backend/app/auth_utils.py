import os
import jwt
from datetime import datetime, timedelta
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

JWT_SECRET = os.getenv("JWT_SECRET", "super-secure-jwt-secret-key-987654321")

def create_access_token(payload: dict) -> str:
    # Expire in 24 hours
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = payload.copy()
    to_encode.update({"exp": expire.timestamp()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded
    except jwt.PyJWTError:
        return None

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = None
    
    # 1. Read from cookies
    if "token" in request.cookies:
        raw_cookie = request.cookies.get("token")
        # Express cookie-parser prepends 's:' to signed cookies.
        if raw_cookie and raw_cookie.startswith("s:"):
            # Strip the 's:' prefix
            token_without_s = raw_cookie[2:]
            # Express signed cookies append hmac signature after a '.' character (e.g. s:JWT_PART1.PART2.PART3.HMAC_SIG)
            parts = token_without_s.split(".")
            if len(parts) >= 4:
                token = ".".join(parts[:3])
            else:
                token = token_without_s
        else:
            token = raw_cookie
            
    # 2. Fallback to Authorization Header
    auth_header = request.headers.get("Authorization")
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied: No session token provided"
        )
        
    payload = decode_access_token(token)
    if not payload or "userId" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token"
        )
        
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied: User session invalid"
        )
        
    return user

def require_role(allowed_roles: list):
    def dependency(user: User = Depends(get_current_user)):
        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Access denied. Administrative privileges required."}
            )
        return user
    return dependency
