from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import hashlib
import secrets
from datetime import datetime, timedelta
import logging

# This would normally be imported from a database session dependency
# For demo purposes, we'll simulate database operations

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

logger = logging.getLogger(__name__)


# Pydantic models for request/response


class UserLogin(BaseModel):
    # Use plain str to avoid pydantic email validator compatibility issues
    email: str
    password: str


class UserCreate(BaseModel):
    # Use plain str for email to avoid validation edge-cases
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# In-memory storage for demo (in production, use proper database)

demo_users = {}

demo_sessions = {}


def hash_password(password: str) -> str:
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def create_access_token(user_id: int) -> str:
    """Create a session token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    demo_sessions[token] = {
        "user_id": user_id,
        "expires_at": expires_at,
        "is_active": True,
    }

    return token


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        if user_data.email in [u["email"] for u in demo_users.values()]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        user_id = len(demo_users) + 1
        hashed_password = hash_password(user_data.password)

        new_user = {
            "id": user_id,
            "email": user_data.email,
            "password_hash": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }

        demo_users[user_id] = new_user

        return UserResponse(**new_user)

    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user",
        )


@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: UserLogin):
    """Authenticate user and return access token"""
    try:
        # For demo purposes, accept any credentials
        # In production, verify against database

        # Find or create demo user
        demo_user = None
        for user in demo_users.values():
            if user["email"] == login_data.email:
                demo_user = user
                break

        if not demo_user:
            # Create demo user for any email
            user_id = len(demo_users) + 1
            demo_user = {
                "id": user_id,
                "email": login_data.email,
                "password_hash": hash_password(login_data.password),
                "first_name": "Demo",
                "last_name": "User",
                "is_active": True,
                "created_at": datetime.utcnow(),
            }
            demo_users[user_id] = demo_user

        # Create access token
        access_token = create_access_token(demo_user["id"])

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**demo_user),
        )

    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current authenticated user"""
    try:
        token = credentials.credentials

        # Check if token exists and is valid
        session = demo_sessions.get(token)
        if not session or not session["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        # Check if token is expired
        if datetime.utcnow() > session["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token expired",
            )

        # Get user
        user = demo_users.get(session["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return UserResponse(**user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information",
        )


@router.post("/logout")
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout user and invalidate token"""
    try:
        token = credentials.credentials

        # Invalidate session
        if token in demo_sessions:
            demo_sessions[token]["is_active"] = False

        return {"message": "Successfully logged out"}

    except Exception as e:
        logger.error(f"Error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout user",
        )


@router.get("/status")
async def auth_status():
    """Get authentication system status"""
    return {
        "status": "active",
        "total_users": len(demo_users),
        "active_sessions": len([
            s for s in demo_sessions.values() if s["is_active"]
        ]),
        "message": "Demo authentication system - accepts any credentials",
    }
