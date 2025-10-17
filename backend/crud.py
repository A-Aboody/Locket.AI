"""
CRUD operations for database
"""

import bcrypt
from sqlalchemy.orm import Session
from database_models import User, UserRole
from schemas import UserRegister
from typing import Optional


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_data: UserRegister) -> User:
    """
    Create a new user
    
    Args:
        db: Database session
        user_data: User registration data
    
    Returns:
        Created user object
    """
    hashed_pw = hash_password(user_data.password)
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_pw,
        role=UserRole.USER,  # Default role is standard user
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate user by email and password
    
    Args:
        db: Database session
        email: User email
        password: Plain text password
    
    Returns:
        User object if authentication successful, None otherwise
    """
    user = get_user_by_email(db, email)
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    if not user.is_active:
        return None
    
    return user