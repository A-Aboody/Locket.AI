"""
Database models for Document Retrieval System
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

Base = declarative_base()


class UserRole(enum.Enum):
    """User role enumeration"""
    USER = "user"
    ADMIN = "admin"


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    documents = relationship(
        "Document", 
        back_populates="uploaded_by",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    created_groups = relationship(
        "UserGroup",
        back_populates="creator",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    group_memberships = relationship(
        "UserGroupMember",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role={self.role.value})>"


class UserGroup(Base):
    """User Group model for collaborative document sharing"""
    __tablename__ = "user_groups"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    creator = relationship("User", back_populates="created_groups")
    members = relationship(
        "UserGroupMember", 
        back_populates="group",
        cascade="all, delete-orphan"
    )
    documents = relationship(
        "Document",
        back_populates="user_group",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<UserGroup(id={self.id}, name='{self.name}')>"


class UserGroupMember(Base):
    """Association table for users and groups"""
    __tablename__ = "user_group_members"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="group_memberships")
    group = relationship("UserGroup", back_populates="members")
    
    # Unique constraint
    __table_args__ = (UniqueConstraint('user_id', 'group_id', name='_user_group_uc'),)
    
    def __repr__(self):
        return f"<UserGroupMember(user_id={self.user_id}, group_id={self.group_id})>"


class Document(Base):
    """Document model for storing uploaded files and metadata"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, unique=True)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)
    page_count = Column(Integer, default=1)
    
    # Visibility settings
    visibility = Column(String(20), default="private", nullable=False)  # 'private', 'public', 'group'
    user_group_id = Column(Integer, ForeignKey("user_groups.id", ondelete="SET NULL"), nullable=True)
    
    # AI/Search fields
    embedding = Column(JSON, nullable=True)
    content_preview = Column(String(500), nullable=True)
    
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    uploaded_by = relationship("User", back_populates="documents")
    user_group = relationship("UserGroup", back_populates="documents")
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', visibility='{self.visibility}')>"
    
    def get_visibility_display(self) -> str:
        """Get human-readable visibility description"""
        if self.visibility == 'private':
            return 'Private (Only you)'
        elif self.visibility == 'public':
            return 'Public (All users)'
        elif self.visibility == 'group':
            group_name = self.user_group.name if self.user_group else 'Unknown Group'
            return f'Group ({group_name})'
        else:
            return 'Unknown'