from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status, Query
from decouple import config
from app.database import Database
import os
import requests

async def verify_recaptcha(token: str) -> bool:
    """Verify Google reCAPTCHA token"""
    secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
    if not secret_key:
        # If no secret key is provided, bypass verification for development
        # In production, this should always be checked
        return True
        
    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={
                "secret": secret_key,
                "response": token
            }
        )
        result = response.json()
        return result.get("success", False)
    except Exception:
        return False

# Get secret key from environment variable
SECRET_KEY = config('JWT_SECRET_KEY')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        exp = payload.get("exp")
        if not exp or datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
            
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )

        # Get user data from database
        db = await Database.get_db()
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        return {
            "id": str(user["_id"]),
            "username": username,
            "role": role,
            "nama_depan": user["nama_depan"],
            "nama_belakang": user["nama_belakang"]
        }
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

async def get_current_user_from_token(token: str = Query(None)) -> Dict:
    """
    Get current user from token provided as query parameter.
    This is used for endpoints that need to be accessed directly (like PDF downloads).
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        exp = payload.get("exp")
        if not exp or datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
            
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )

        # Get user data from database
        db = await Database.get_db()
        user = await db.users.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Get assigned instansi if available
        assigned_instansi = None
        if user.get("instansi_id"):
            instansi = await db.instansi.find_one({"_id": user["instansi_id"]})
            if instansi:
                assigned_instansi = {
                    "id": str(instansi["_id"]),
                    "nama_instansi": instansi.get("nama_instansi", "")
                }
        
        return {
            "id": str(user["_id"]),
            "username": username,
            "role": role,
            "nama_depan": user["nama_depan"],
            "nama_belakang": user["nama_belakang"],
            "assigned_instansi": assigned_instansi
        }
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) 