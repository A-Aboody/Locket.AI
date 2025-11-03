# backend/dependencies.py
"""
FastAPI dependencies
Enhanced authentication and authorization
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db_config import get_db
from database_models import User, UserRole, UserStatus
import crud
import auth


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token with enhanced checks
    
    Args:
        credentials: HTTP Bearer token
        db: Database session
    
    Returns:
        Current user object
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Verify token
    payload = auth.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = crud.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if email is verified (for critical operations)
    # This can be made optional for some endpoints
    is_verified = payload.get("verified", False)
    if not is_verified and not user.email_verified:
        # Allow access but mark as unverified
        # Individual endpoints can check verification status if needed
        pass
    
    return user


def require_verified_email(current_user: User = Depends(get_current_user)) -> User:
    """
    Require verified email for endpoint access
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Current user if email is verified
    
    Raises:
        HTTPException: If email is not verified
    """
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Require admin role for endpoint access
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Current user if admin
    
    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


def require_admin_or_verified_email(current_user: User = Depends(get_current_user)) -> User:
    """
    Require either admin role or verified email
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Current user if admin or verified
    
    Raises:
        HTTPException: If neither admin nor verified
    """
    if current_user.role != UserRole.ADMIN and not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access or verified email required"
        )
    
    return current_user