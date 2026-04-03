from datetime import datetime, timedelta
from typing import Dict, Optional

from app.database import Database
from decouple import config
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# Get secret key from environment variable
SECRET_KEY = config("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
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
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": str(user["_id"]),
            "username": username,
            "role": role,
            "nama_depan": user["nama_depan"],
            "nama_belakang": user["nama_belakang"],
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

    return await validate_token(token)


async def validate_token(token: str) -> Optional[Dict]:
    """
    Validate a JWT token and return user info.
    Returns None if token is invalid (does not raise exceptions).
    Used by middleware and other non-essential auth checks.
    """
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        exp = payload.get("exp")
        if not exp or datetime.fromtimestamp(exp) < datetime.utcnow():
            return None

        username: str = payload.get("sub")
        role: str = payload.get("role")

        if username is None:
            return None

        # Get user data from database
        db = await Database.get_db()
        user = await db.users.find_one({"username": username})
        if not user:
            return None

        return {
            "id": str(user["_id"]),
            "username": username,
            "role": role,
            "nama_depan": user["nama_depan"],
            "nama_belakang": user["nama_belakang"],
        }

    except (JWTError, Exception):
        return None
