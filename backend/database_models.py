# backend/database_models.py
"""
Database models for Document Retrieval System
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, JSON, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

Base = declarative_base()


class UserRole(enum.Enum):
    """User role enumeration"""
    USER = "user"
    ADMIN = "admin"


class UserStatus(enum.Enum):
    """User status enumeration"""
    PENDING = "pending"  # Email not verified
    ACTIVE = "active"    # Email verified
    SUSPENDED = "suspended"
    DELETED = "deleted"


class OrgRole(enum.Enum):
    """Organization role enumeration"""
    MEMBER = "member"
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
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)  # New field
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)  # New field
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, nullable=True)  # New field
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationships
    documents = relationship(
        "Document", 
        back_populates="uploaded_by",
        cascade="all, delete-orphan",
        lazy="dynamic",
        foreign_keys=lambda: [Document.__table__.c.uploaded_by_id]
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
    verification_codes = relationship(
        "VerificationCode",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    org_membership = relationship(
        "OrganizationMember",
        back_populates="user",
        uselist=False,
        foreign_keys=lambda: [OrganizationMember.__table__.c.user_id]
    )
    organization = relationship(
        "Organization",
        foreign_keys=[organization_id]
    )

    @property
    def org_role(self):
        """Get the user's role within their organization"""
        if self.org_membership:
            return self.org_membership.role.value
        return None

    @property
    def organization_name(self):
        """Get the name of the user's organization"""
        if self.organization:
            return self.organization.name
        return None

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', status={self.status.value})>"


class VerificationCode(Base):
    """Email verification codes"""
    __tablename__ = "verification_codes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False)  # 6-digit code
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="verification_codes")
    
    # Indexes
    __table_args__ = (
        Index('ix_verification_codes_user_code', 'user_id', 'code'),
        Index('ix_verification_codes_expires', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<VerificationCode(user_id={self.user_id}, code='{self.code}')>"


class PasswordResetToken(Base):
    """Password reset tokens"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="reset_tokens")
    
    # Indexes
    __table_args__ = (
        Index('ix_reset_tokens_expires', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<PasswordResetToken(user_id={self.user_id}, token='{self.token[:10]}...')>"


class UserGroup(Base):
    """User Group model for collaborative document sharing"""
    __tablename__ = "user_groups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="created_groups")
    organization = relationship("Organization", back_populates="groups")
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

    # Indexes
    __table_args__ = (Index('ix_user_groups_org_id', 'organization_id'),)

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


class Organization(Base):
    """Organization model for collaborative workspaces"""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    invite_code = Column(String(32), unique=True, nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    settings = Column(JSON, nullable=True, default=lambda: {
        "allow_member_invites": True,
        "default_document_visibility": "private",
        "require_admin_approval": False
    })

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id])
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    invites = relationship("OrganizationInvite", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("UserGroup", back_populates="organization")
    documents = relationship("Document", back_populates="organization")

    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}')>"


class OrganizationMember(Base):
    """Association table for users and organizations with role management"""
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(OrgRole), default=OrgRole.MEMBER, nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    invited_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="org_membership")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'user_id', name='_org_user_uc'),
        Index('ix_org_members_org_id', 'organization_id'),
        Index('ix_org_members_user_id', 'user_id'),
    )

    def __repr__(self):
        return f"<OrganizationMember(org_id={self.organization_id}, user_id={self.user_id}, role='{self.role.value}')>"


class OrganizationInvite(Base):
    """Organization invitation model for managing invite codes and email invitations"""
    __tablename__ = "organization_invites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    invite_type = Column(String(20), nullable=False)  # 'code' or 'email'
    email = Column(String(100), nullable=True, index=True)  # For email invitations
    invite_code = Column(String(32), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="invites")
    created_by = relationship("User")

    __table_args__ = (
        Index('ix_org_invites_org_id', 'organization_id'),
        Index('ix_org_invites_email', 'email'),
        Index('ix_org_invites_code', 'invite_code'),
    )

    def __repr__(self):
        return f"<OrganizationInvite(id={self.id}, org_id={self.organization_id}, type='{self.invite_type}')>"


class Folder(Base):
    """Virtual folder for organizing documents"""
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    scope = Column(String(20), default="private", nullable=False)  # 'private' or 'organization'
    group_id = Column(Integer, ForeignKey("user_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    parent = relationship("Folder", remote_side=[id], backref="children")
    owner = relationship("User")
    organization = relationship("Organization")
    group = relationship("UserGroup")
    documents = relationship("Document", back_populates="folder")

    __table_args__ = (
        Index('ix_folders_owner_parent', 'owner_id', 'parent_id'),
        Index('ix_folders_scope_org_group', 'scope', 'organization_id', 'group_id'),
    )

    def __repr__(self):
        return f"<Folder(id={self.id}, name='{self.name}', scope='{self.scope}', parent_id={self.parent_id})>"


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
    visibility = Column(String(20), default="private", nullable=False)  # 'private', 'public', 'group', 'organization'
    user_group_id = Column(Integer, ForeignKey("user_groups.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # AI/Search fields
    embedding = Column(JSON, nullable=True)
    content_preview = Column(String(500), nullable=True)
    summary = Column(Text, nullable=True)  # AI-generated summary (cached)
    summary_generated_at = Column(DateTime, nullable=True)  # Track when summary was generated

    # Trash / soft-delete fields
    is_trashed = Column(Boolean, default=False, nullable=False, index=True)
    trashed_at = Column(DateTime, nullable=True)
    trashed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Folder support
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True, index=True)

    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    uploaded_by = relationship("User", back_populates="documents", foreign_keys=[uploaded_by_id])
    user_group = relationship("UserGroup", back_populates="documents")
    organization = relationship("Organization", back_populates="documents")
    folder = relationship("Folder", back_populates="documents")

    # Indexes
    __table_args__ = (
        Index('ix_documents_org_id', 'organization_id'),
        Index('ix_documents_folder_id', 'folder_id'),
    )

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
        elif self.visibility == 'organization':
            org_name = self.organization.name if self.organization else 'Unknown Organization'
            return f'Organization ({org_name})'
        else:
            return 'Unknown'


class DocumentActivity(Base):
    """Tracks user interactions with documents (views, opens, etc.) for recent activity"""
    __tablename__ = "document_activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(20), nullable=False, default="view")  # 'view', 'preview', 'download'
    accessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User")
    document = relationship("Document")

    __table_args__ = (
        Index('ix_doc_activity_user_accessed', 'user_id', 'accessed_at'),
        Index('ix_doc_activity_user_doc', 'user_id', 'document_id'),
    )

    def __repr__(self):
        return f"<DocumentActivity(user_id={self.user_id}, doc_id={self.document_id}, type='{self.activity_type}')>"


class Chat(Base):
    """Chat session model for storing conversations"""
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    messages = relationship(
        "ChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )
    citations = relationship(
        "ChatCitation",
        back_populates="chat",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Chat(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class ChatMessage(Base):
    """Chat message model for storing individual messages in a chat"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    citations = relationship(
        "ChatCitation",
        back_populates="message",
        cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index('ix_chat_messages_chat_id', 'chat_id'),
    )

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, chat_id={self.chat_id}, role='{self.role}')>"


class ChatCitation(Base):
    """Chat citation model for linking documents to chat messages"""
    __tablename__ = "chat_citations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    relevance_score = Column(Integer, nullable=True)  # 0-100
    excerpt = Column(Text, nullable=True)  # Relevant excerpt from document
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    chat = relationship("Chat", back_populates="citations")
    message = relationship("ChatMessage", back_populates="citations")
    document = relationship("Document")

    # Indexes
    __table_args__ = (
        Index('ix_chat_citations_chat_id', 'chat_id'),
        Index('ix_chat_citations_message_id', 'message_id'),
        Index('ix_chat_citations_document_id', 'document_id'),
    )

    def __repr__(self):
        return f"<ChatCitation(id={self.id}, message_id={self.message_id}, document_id={self.document_id})>"