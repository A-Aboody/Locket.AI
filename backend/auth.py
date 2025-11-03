# backend/auth.py
"""
Authentication utilities
JWT token creation and validation with enhanced features
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from config import config
import logging

logger = logging.getLogger(__name__)


def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None,
    remember_me: bool = False
) -> str:
    """
    Create JWT access token with enhanced features
    
    Args:
        data: Data to encode in token (typically user_id and role)
        expires_delta: Token expiration time
        remember_me: Whether to create a long-lived token
    
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    elif remember_me:
        # Long-lived token for "remember me" (30 days)
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    else:
        # Standard token (24 hours)
        expire = datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),  # Issued at
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
    
    logger.info(f"Created access token for user {data.get('sub')}, expires: {expire}")
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """
    Create refresh token for obtaining new access tokens
    
    Args:
        user_id: User ID
    
    Returns:
        Encoded refresh token
    """
    expire = datetime.now(timezone.utc) + timedelta(days=30)  # 30 days
    
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)
    
    logger.info(f"Created refresh token for user {user_id}")
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token
    
    Args:
        token: JWT token to verify
        token_type: Expected token type ('access' or 'refresh')
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        
        # Verify token type
        if payload.get("type") != token_type:
            logger.warning(f"Invalid token type: expected {token_type}, got {payload.get('type')}")
            return None
        
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None


def refresh_access_token(refresh_token: str) -> Optional[str]:
    """
    Create new access token using refresh token
    
    Args:
        refresh_token: Valid refresh token
    
    Returns:
        New access token or None if refresh token is invalid
    """
    payload = verify_token(refresh_token, "refresh")
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    # Create new access token
    new_access_token = create_access_token({"sub": user_id})
    
    logger.info(f"Refreshed access token for user {user_id}")
    return new_access_token