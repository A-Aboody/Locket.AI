# backend/crud.py
"""
CRUD operations for database
"""

import bcrypt
import secrets
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from database_models import (
    User, UserRole, UserStatus, Document, UserGroup, UserGroupMember,
    VerificationCode, PasswordResetToken, Organization, OrganizationMember,
    OrganizationInvite, OrgRole
)
from schemas import UserRegister
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from config import config


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


def get_user_by_email_or_username(db: Session, identifier: str) -> Optional[User]:
    """
    Get user by email or username
    
    Args:
        db: Database session
        identifier: Email or username
    
    Returns:
        User object if found
    """
    return db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()


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
        status=UserStatus.PENDING,  # New users start as pending until email verification
        is_active=True,
        email_verified=False,  # Email not verified initially
        last_password_change=datetime.now(timezone.utc)
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


def update_user_password(db: Session, user_id: int, new_password: str) -> bool:
    """
    Update user password and track last change time
    
    Args:
        db: Database session
        user_id: User ID
        new_password: New plain text password
    
    Returns:
        True if successful
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    hashed_pw = hash_password(new_password)
    user.hashed_password = hashed_pw
    user.last_password_change = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return True


def verify_user_email(db: Session, user_id: int) -> bool:
    """
    Mark user's email as verified and activate account
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        True if successful
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.email_verified = True
    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return True


def deactivate_user(db: Session, user_id: int) -> bool:
    """
    Deactivate user account
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        True if successful
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_active = False
    user.status = UserStatus.SUSPENDED
    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return True


def activate_user(db: Session, user_id: int) -> bool:
    """
    Activate user account
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        True if successful
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_active = True
    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return True


def get_verification_code(db: Session, user_id: int, code: str) -> Optional[VerificationCode]:
    """
    Get a verification code for a user
    
    Args:
        db: Database session
        user_id: User ID
        code: Verification code
    
    Returns:
        VerificationCode object if found
    """
    return db.query(VerificationCode).filter(
        VerificationCode.user_id == user_id,
        VerificationCode.code == code,
        VerificationCode.is_used == False,
        VerificationCode.expires_at > datetime.now(timezone.utc)
    ).first()


def mark_verification_code_used(db: Session, verification_id: int) -> bool:
    """
    Mark a verification code as used
    
    Args:
        db: Database session
        verification_id: Verification code ID
    
    Returns:
        True if successful
    """
    verification = db.query(VerificationCode).filter(
        VerificationCode.id == verification_id
    ).first()
    
    if verification:
        verification.is_used = True
        verification.used_at = datetime.now(timezone.utc)
        db.commit()
        return True
    
    return False


def get_password_reset_token(db: Session, token: str) -> Optional[PasswordResetToken]:
    """
    Get a password reset token
    
    Args:
        db: Database session
        token: Reset token
    
    Returns:
        PasswordResetToken object if found
    """
    return db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc)
    ).first()


def mark_reset_token_used(db: Session, token_id: int) -> bool:
    """
    Mark a reset token as used
    
    Args:
        db: Database session
        token_id: Reset token ID
    
    Returns:
        True if successful
    """
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.id == token_id
    ).first()
    
    if reset_token:
        reset_token.is_used = True
        reset_token.used_at = datetime.now(timezone.utc)
        db.commit()
        return True
    
    return False


def create_verification_code_record(db: Session, user_id: int, email: str, code: str, expires_at: datetime) -> VerificationCode:
    """
    Create a new verification code record
    
    Args:
        db: Database session
        user_id: User ID
        email: User email
        code: Verification code
        expires_at: Expiration datetime
    
    Returns:
        Created VerificationCode object
    """
    verification_code = VerificationCode(
        user_id=user_id,
        email=email,
        code=code,
        expires_at=expires_at,
        is_used=False
    )
    
    db.add(verification_code)
    db.commit()
    db.refresh(verification_code)
    
    return verification_code


def create_password_reset_token_record(db: Session, user_id: int, token: str, expires_at: datetime) -> PasswordResetToken:
    """
    Create a new password reset token record
    
    Args:
        db: Database session
        user_id: User ID
        token: Reset token
        expires_at: Expiration datetime
    
    Returns:
        Created PasswordResetToken object
    """
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        is_used=False
    )
    
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    
    return reset_token


def invalidate_user_verification_codes(db: Session, user_id: int) -> int:
    """
    Invalidate all unused verification codes for a user
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Number of codes invalidated
    """
    result = db.query(VerificationCode).filter(
        VerificationCode.user_id == user_id,
        VerificationCode.is_used == False
    ).update({"is_used": True})
    
    db.commit()
    return result


def invalidate_user_reset_tokens(db: Session, user_id: int) -> int:
    """
    Invalidate all unused reset tokens for a user
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Number of tokens invalidated
    """
    result = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    
    db.commit()
    return result


def cleanup_expired_tokens(db: Session) -> Dict[str, int]:
    """
    Clean up expired verification codes and reset tokens
    
    Args:
        db: Database session
    
    Returns:
        Dictionary with cleanup statistics
    """
    now = datetime.now(timezone.utc)
    
    # Clean expired verification codes
    expired_codes = db.query(VerificationCode).filter(
        VerificationCode.expires_at <= now
    ).delete()
    
    # Clean expired reset tokens
    expired_tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at <= now
    ).delete()
    
    db.commit()
    
    return {
        "expired_codes_cleaned": expired_codes,
        "expired_tokens_cleaned": expired_tokens
    }


# Document CRUD Operations

def create_document(
    db: Session,
    filename: str,
    file_path: str,
    file_type: str,
    file_size: int,
    content: Optional[str],
    page_count: int,
    user_id: int,
    visibility: str = 'private',
    user_group_id: Optional[int] = None
) -> Document:
    """
    Create a new document record
    
    Args:
        db: Database session
        filename: Original filename
        file_path: Storage path
        file_type: MIME type
        file_size: File size in bytes
        content: Extracted text content
        page_count: Number of pages
        user_id: ID of user who uploaded
        visibility: Document visibility ('private', 'public', 'group')
        user_group_id: ID of user group for group documents
    
    Returns:
        Created document object
    """
    document = Document(
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        content=content,
        page_count=page_count,
        uploaded_by_id=user_id,
        visibility=visibility,
        user_group_id=user_group_id if visibility == 'group' else None
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


def get_document_by_id(db: Session, document_id: int) -> Optional[Document]:
    """Get document by ID with uploader info"""
    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(Document.id == document_id).first()


def get_user_documents(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Get all documents for a specific user
    
    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of documents
    """
    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(
        Document.uploaded_by_id == user_id
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def get_visible_documents(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Get documents visible to a specific user
    Admins can see all documents

    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of visible documents
    """
    # Check if user is admin
    user = get_user_by_id(db, user_id)
    if user and user.role == UserRole.ADMIN:
        # Admins see everything
        return get_all_documents(db, skip=skip, limit=limit)

    # Get all groups the user is member of
    user_group_ids = db.query(UserGroupMember.group_id).filter(
        UserGroupMember.user_id == user_id
    ).scalar_subquery()

    # Build visibility conditions
    conditions = [
        # User's own private documents
        and_(
            Document.visibility == 'private',
            Document.uploaded_by_id == user_id
        ),
        # Group documents where user is member
        and_(
            Document.visibility == 'group',
            Document.user_group_id.in_(user_group_ids)
        )
    ]

    # SECURITY: Public and organization documents - only within same organization
    if user.organization_id:
        # User in organization: show public docs from their organization
        conditions.append(
            and_(
                Document.visibility == 'public',
                Document.organization_id == user.organization_id
            )
        )
        # Organization-wide documents visible to all org members
        conditions.append(
            and_(
                Document.visibility == 'organization',
                Document.organization_id == user.organization_id
            )
        )
    else:
        # User not in organization: show public docs with no organization (legacy)
        conditions.append(
            and_(
                Document.visibility == 'public',
                Document.organization_id.is_(None)
            )
        )

    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(
        or_(*conditions)
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def get_personal_documents(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Get only the user's own private documents (personal mode - Documents tab).
    
    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of user's private documents
    """
    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(
        and_(
            Document.uploaded_by_id == user_id,
            Document.visibility == 'private'
        )
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def get_organization_documents(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Get all documents visible in organization mode (Documents tab).
    Includes: organization-wide docs, group docs within the org, public docs within the org,
    and the user's own private documents.
    Admins see all documents.
    
    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of organization-scoped documents
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return []

    # Admins see everything
    if user.role == UserRole.ADMIN:
        return get_all_documents(db, skip=skip, limit=limit)

    # User must be in an organization for org mode
    if not user.organization_id:
        # Fallback to personal documents if not in an org
        return get_personal_documents(db, user_id, skip=skip, limit=limit)

    # Get all groups the user is member of
    user_group_ids = db.query(UserGroupMember.group_id).filter(
        UserGroupMember.user_id == user_id
    ).scalar_subquery()

    conditions = [
        # Organization-wide documents
        and_(
            Document.visibility == 'organization',
            Document.organization_id == user.organization_id
        ),
        # Group documents where user is a member
        and_(
            Document.visibility == 'group',
            Document.user_group_id.in_(user_group_ids)
        ),
        # Public documents within the same organization
        and_(
            Document.visibility == 'public',
            Document.organization_id == user.organization_id
        ),
        # User's own private documents (still visible to them in org mode)
        and_(
            Document.visibility == 'private',
            Document.uploaded_by_id == user_id
        ),
    ]

    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(
        or_(*conditions)
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def get_all_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Get all documents with uploader info
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of all documents
    """
    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def delete_document(db: Session, document_id: int) -> bool:
    """
    Delete a document by ID
    
    Args:
        db: Database session
        document_id: Document ID
    
    Returns:
        True if deleted successfully
    """
    document = get_document_by_id(db, document_id)
    if document:
        db.delete(document)
        db.commit()
        return True
    return False


def update_document_visibility(db: Session, document_id: int, visibility: str, user_group_id: Optional[int] = None, organization_id: Optional[int] = None) -> Optional[Document]:
    """
    Update document visibility, group association, and organization scope

    Args:
        db: Database session
        document_id: Document ID
        visibility: New visibility setting ('private', 'public', 'group', or 'organization')
        user_group_id: Group ID if visibility is 'group', otherwise None
        organization_id: Organization ID if visibility is 'public' or 'organization'

    Returns:
        Updated document if successful, None otherwise
    """
    document = get_document_by_id(db, document_id)
    if not document:
        return None

    # Update visibility
    document.visibility = visibility

    # Update group association
    if visibility == 'group':
        document.user_group_id = user_group_id
    else:
        document.user_group_id = None

    # Update organization scope
    if visibility in ['public', 'organization']:
        document.organization_id = organization_id
    elif visibility == 'private':
        document.organization_id = None

    document.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(document)
    return document


def user_owns_document(db: Session, user_id: int, document_id: int) -> bool:
    """
    Check if user owns a specific document

    Args:
        db: Database session
        user_id: User ID
        document_id: Document ID

    Returns:
        True if user owns the document
    """
    document = get_document_by_id(db, document_id)
    return document is not None and document.uploaded_by_id == user_id


def can_user_access_document(db: Session, user_id: int, document_id: int) -> bool:
    """
    Check if user can access a specific document based on visibility

    Args:
        db: Database session
        user_id: User ID
        document_id: Document ID

    Returns:
        True if user can access the document
    """
    document = get_document_by_id(db, document_id)
    if not document:
        return False

    # Admin can access everything
    user = get_user_by_id(db, user_id)
    if user and user.role == UserRole.ADMIN:
        return True

    # Check visibility
    if document.visibility == 'public':
        # SECURITY: Public documents should only be visible within the same organization
        # If document belongs to an organization, user must be in that organization
        if document.organization_id:
            if not user.organization_id:
                return False
            return user.organization_id == document.organization_id
        # If document has no organization (legacy), it's truly public
        return True

    if document.visibility == 'private':
        return document.uploaded_by_id == user_id

    if document.visibility == 'group':
        return is_user_in_group(db, user_id, document.user_group_id)

    if document.visibility == 'organization':
        # Must be in same organization
        if not user.organization_id or not document.organization_id:
            return False
        return user.organization_id == document.organization_id

    return False


# Search Operations

def update_document_embedding(db: Session, document_id: int, embedding: List[float], preview: str) -> bool:
    """
    Update document with embedding and preview
    
    Args:
        db: Database session
        document_id: Document ID
        embedding: Embedding vector
        preview: Content preview
    
    Returns:
        True if updated successfully
    """
    document = get_document_by_id(db, document_id)
    if document:
        document.embedding = embedding
        document.content_preview = preview
        db.commit()
        return True
    return False


def get_all_documents_for_search(db: Session, user_id: int) -> List[Dict]:
    """
    Get all documents with necessary fields for search (respects visibility)
    Admins can search all documents regardless of visibility

    Args:
        db: Database session
        user_id: User ID to check visibility for

    Returns:
        List of document dictionaries
    """
    documents = get_visible_documents(db, user_id)
    
    result = []
    for doc in documents:
        result.append({
            'id': doc.id,
            'filename': doc.filename,
            'file_type': doc.file_type,
            'file_size': doc.file_size,
            'page_count': doc.page_count,
            'content': doc.content,
            'embedding': doc.embedding,
            'uploaded_at': doc.uploaded_at,
            'uploaded_by_username': doc.uploaded_by.username if doc.uploaded_by else "Unknown",
            'visibility': doc.visibility,
            'user_group_id': doc.user_group_id
        })
    
    return result


# User Group CRUD Operations

def create_user_group(db: Session, group_data, creator_id: int) -> UserGroup:
    """
    Create a new user group
    
    Args:
        db: Database session
        group_data: Group creation data
        creator_id: ID of user creating the group
    
    Returns:
        Created user group
    """
    # Validate that all member IDs exist
    for user_id in group_data.member_ids:
        user = get_user_by_id(db, user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
    
    # Create the group
    group = UserGroup(
        name=group_data.name,
        description=group_data.description,
        created_by_id=creator_id
    )
    db.add(group)
    db.flush()  # Flush to get the group ID
    
    # Add creator as member
    creator_member = UserGroupMember(
        user_id=creator_id,
        group_id=group.id
    )
    db.add(creator_member)
    
    # Add other members
    for user_id in group_data.member_ids:
        if user_id != creator_id:  # Don't add creator twice
            member = UserGroupMember(
                user_id=user_id,
                group_id=group.id
            )
            db.add(member)
    
    db.commit()
    db.refresh(group)
    return group


def get_user_group_by_id(db: Session, group_id: int) -> Optional[UserGroup]:
    """Get user group by ID with members"""
    return db.query(UserGroup).options(
        joinedload(UserGroup.members).joinedload(UserGroupMember.user),
        joinedload(UserGroup.creator)
    ).filter(UserGroup.id == group_id).first()


def get_user_groups_for_user(db: Session, user_id: int) -> List[UserGroup]:
    """Get all groups that a user is member of"""
    return db.query(UserGroup).options(
        joinedload(UserGroup.members).joinedload(UserGroupMember.user),
        joinedload(UserGroup.creator)
    ).join(UserGroupMember).filter(
        UserGroupMember.user_id == user_id
    ).all()


def is_user_in_group(db: Session, user_id: int, group_id: int) -> bool:
    """Check if user is member of a group"""
    if not group_id:  # Handle None group_id
        return False
        
    return db.query(UserGroupMember).filter(
        UserGroupMember.user_id == user_id,
        UserGroupMember.group_id == group_id
    ).first() is not None


def add_user_to_group(db: Session, user_id: int, group_id: int) -> bool:
    """Add user to group"""
    if is_user_in_group(db, user_id, group_id):
        return False  # Already in group
    
    member = UserGroupMember(
        user_id=user_id,
        group_id=group_id
    )
    db.add(member)
    db.commit()
    return True


def remove_user_from_group(db: Session, user_id: int, group_id: int) -> bool:
    """Remove user from group (cannot remove creator)"""
    group = get_user_group_by_id(db, group_id)
    if group and group.created_by_id == user_id:
        return False  # Cannot remove creator
    
    member = db.query(UserGroupMember).filter(
        UserGroupMember.user_id == user_id,
        UserGroupMember.group_id == group_id
    ).first()
    
    if member:
        db.delete(member)
        db.commit()
        return True
    
    return False


def delete_user_group(db: Session, group_id: int) -> bool:
    """Delete a user group (only creator or admin can do this)"""
    group = get_user_group_by_id(db, group_id)
    if group:
        # Set all documents in this group to private
        documents = db.query(Document).filter(Document.user_group_id == group_id).all()
        for doc in documents:
            doc.visibility = 'private'
            doc.user_group_id = None
        
        db.delete(group)
        db.commit()
        return True
    return False


def search_users(db: Session, query: str, exclude_user_id: Optional[int] = None, include_inactive: bool = False) -> List[User]:
    """
    Search users by username or email

    Args:
        db: Database session
        query: Search query string
        exclude_user_id: Optional user ID to exclude from results
        include_inactive: If True, include inactive users (for admin searches)

    Returns:
        List of matching users
    """
    from sqlalchemy import or_, and_

    search_filter = or_(
        User.username.ilike(f"%{query}%"),
        User.email.ilike(f"%{query}%")
    )

    if exclude_user_id:
        search_filter = and_(search_filter, User.id != exclude_user_id)

    query_builder = db.query(User).filter(search_filter)

    # Only filter by active status if we're not including inactive users
    if not include_inactive:
        query_builder = query_builder.filter(User.is_active == True)

    return query_builder.limit(20).all()


def update_user_group(db: Session, group_id: int, update_data) -> Optional[UserGroup]:
    """Update user group details"""
    group = get_user_group_by_id(db, group_id)
    if group:
        if update_data.name is not None:
            group.name = update_data.name
        if update_data.description is not None:
            group.description = update_data.description
        
        db.commit()
        db.refresh(group)
        return group
    return None


def get_group_members(db: Session, group_id: int) -> List[User]:
    """Get all members of a user group"""
    return db.query(User).join(UserGroupMember).filter(
        UserGroupMember.group_id == group_id
    ).all()


def get_group_documents(db: Session, group_id: int, skip: int = 0, limit: int = 100) -> List[Document]:
    """Get all documents in a user group"""
    return db.query(Document).options(
        joinedload(Document.uploaded_by)
    ).filter(
        Document.user_group_id == group_id
    ).order_by(
        Document.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


def is_group_creator(db: Session, user_id: int, group_id: int) -> bool:
    """Check if user is the creator of a group"""
    group = get_user_group_by_id(db, group_id)
    return group is not None and group.created_by_id == user_id


def get_user_group_membership_count(db: Session, user_id: int) -> int:
    """Get the number of groups a user is member of"""
    return db.query(UserGroupMember).filter(
        UserGroupMember.user_id == user_id
    ).count()


def get_groups_created_by_user(db: Session, user_id: int) -> List[UserGroup]:
    """Get all groups created by a user"""
    return db.query(UserGroup).options(
        joinedload(UserGroup.members).joinedload(UserGroupMember.user)
    ).filter(
        UserGroup.created_by_id == user_id
    ).all()


def get_available_groups_for_document_upload(db: Session, user_id: int) -> List[UserGroup]:
    """Get groups that a user can upload documents to"""
    return db.query(UserGroup).options(
        joinedload(UserGroup.members).joinedload(UserGroupMember.user)
    ).join(UserGroupMember).filter(
        UserGroupMember.user_id == user_id
    ).all()


def transfer_group_ownership(db: Session, group_id: int, current_owner_id: int, new_owner_id: int) -> bool:
    """
    Transfer group ownership to another member
    
    Args:
        db: Database session
        group_id: Group ID
        current_owner_id: Current owner ID
        new_owner_id: New owner ID
    
    Returns:
        True if transfer successful
    """
    group = get_user_group_by_id(db, group_id)
    if not group or group.created_by_id != current_owner_id:
        return False
    
    # Check if new owner is member of the group
    if not is_user_in_group(db, new_owner_id, group_id):
        return False
    
    # Transfer ownership
    group.created_by_id = new_owner_id
    db.commit()
    return True


def get_document_visibility_stats(db: Session, user_id: int) -> Dict:
    """
    Get visibility statistics for user's documents
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dictionary with visibility statistics
    """
    from sqlalchemy import func
    
    stats = db.query(
        Document.visibility,
        func.count(Document.id).label('count')
    ).filter(
        Document.uploaded_by_id == user_id
    ).group_by(
        Document.visibility
    ).all()
    
    result = {
        'private': 0,
        'public': 0,
        'group': 0,
        'total': 0
    }
    
    for stat in stats:
        result[stat.visibility] = stat.count
        result['total'] += stat.count
    
    return result


def get_group_statistics(db: Session, group_id: int) -> Dict:
    """
    Get statistics for a user group
    
    Args:
        db: Database session
        group_id: Group ID
    
    Returns:
        Dictionary with group statistics
    """
    from sqlalchemy import func
    
    group = get_user_group_by_id(db, group_id)
    if not group:
        return {}
    
    # Member count
    member_count = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id
    ).count()
    
    # Document count
    document_count = db.query(Document).filter(
        Document.user_group_id == group_id
    ).count()
    
    # Recent activity (last document upload)
    last_activity = db.query(Document).filter(
        Document.user_group_id == group_id
    ).order_by(
        Document.uploaded_at.desc()
    ).first()
    
    return {
        'member_count': member_count,
        'document_count': document_count,
        'last_activity': last_activity.uploaded_at if last_activity else None,
        'created_at': group.created_at
    }


def get_user_statistics(db: Session, user_id: int) -> Dict:
    """
    Get statistics for a user
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Dictionary with user statistics
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return {}
    
    # Document count
    document_count = db.query(Document).filter(
        Document.uploaded_by_id == user_id
    ).count()
    
    # Group count
    group_count = get_user_group_membership_count(db, user_id)
    
    # Recent activity
    recent_activity = db.query(Document).filter(
        Document.uploaded_by_id == user_id
    ).order_by(
        Document.uploaded_at.desc()
    ).first()
    
    return {
        'document_count': document_count,
        'group_count': group_count,
        'last_activity': recent_activity.uploaded_at if recent_activity else None,
        'account_created': user.created_at,
        'last_login': user.last_login
    }


# ===================================
# Organization CRUD Operations
# ===================================

def generate_invite_code(length: int = None) -> str:
    """
    Generate a secure random invite code

    Args:
        length: Length of invite code (defaults to config value)

    Returns:
        Random alphanumeric invite code
    """
    if length is None:
        length = config.INVITE_CODE_LENGTH
    return secrets.token_urlsafe(length)[:length]


def create_organization(
    db: Session,
    name: str,
    description: Optional[str],
    created_by_id: int,
    settings: Optional[Dict] = None
) -> Organization:
    """
    Create a new organization

    Args:
        db: Database session
        name: Organization name
        description: Optional description
        created_by_id: ID of user creating the organization
        settings: Optional settings dict

    Returns:
        Created organization object
    """
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(Organization).filter(Organization.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    # Default settings
    if settings is None:
        settings = {
            "allow_member_invites": True,
            "default_document_visibility": "private",
            "require_admin_approval": False
        }

    org = Organization(
        name=name,
        description=description,
        invite_code=invite_code,
        created_by_id=created_by_id,
        settings=settings
    )

    db.add(org)
    db.commit()
    db.refresh(org)

    # Add creator as admin member
    membership = OrganizationMember(
        organization_id=org.id,
        user_id=created_by_id,
        role=OrgRole.ADMIN,
        invited_by_id=None  # Creator wasn't invited
    )
    db.add(membership)

    # Update user's organization_id
    user = get_user_by_id(db, created_by_id)
    user.organization_id = org.id

    db.commit()
    db.refresh(org)

    return org


def get_organization_by_id(db: Session, org_id: int) -> Optional[Organization]:
    """Get organization by ID"""
    return db.query(Organization).filter(Organization.id == org_id).first()


def get_organization_by_name(db: Session, name: str) -> Optional[Organization]:
    """Get organization by name"""
    return db.query(Organization).filter(Organization.name == name).first()


def get_organization_by_invite_code(db: Session, invite_code: str) -> Optional[Organization]:
    """Get organization by invite code"""
    return db.query(Organization).filter(Organization.invite_code == invite_code).first()


def update_organization(
    db: Session,
    org_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    settings: Optional[Dict] = None
) -> Optional[Organization]:
    """
    Update organization details

    Args:
        db: Database session
        org_id: Organization ID
        name: New name (optional)
        description: New description (optional)
        settings: New settings (optional)

    Returns:
        Updated organization or None if not found
    """
    org = get_organization_by_id(db, org_id)
    if not org:
        return None

    if name is not None:
        org.name = name
    if description is not None:
        org.description = description
    if settings is not None:
        org.settings = settings

    db.commit()
    db.refresh(org)

    return org


def delete_organization(db: Session, org_id: int) -> bool:
    """
    Delete organization (cascade deletes members and invites)

    Args:
        db: Database session
        org_id: Organization ID

    Returns:
        True if deleted, False if not found
    """
    org = get_organization_by_id(db, org_id)
    if not org:
        return False

    # Update all users in this org (set organization_id to NULL)
    db.query(User).filter(User.organization_id == org_id).update(
        {User.organization_id: None}
    )

    # Update all documents in this org (set organization_id to NULL, visibility to private)
    db.query(Document).filter(Document.organization_id == org_id).update(
        {Document.organization_id: None, Document.visibility: 'private'}
    )

    # Update all groups in this org (set organization_id to NULL)
    db.query(UserGroup).filter(UserGroup.organization_id == org_id).update(
        {UserGroup.organization_id: None}
    )

    db.delete(org)
    db.commit()

    return True


# ===================================
# Organization Member Operations
# ===================================

def get_organization_member(
    db: Session,
    org_id: int,
    user_id: int
) -> Optional[OrganizationMember]:
    """Get organization membership for a specific user"""
    return db.query(OrganizationMember).filter(
        and_(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id
        )
    ).first()


def get_organization_members(
    db: Session,
    org_id: int
) -> List[OrganizationMember]:
    """Get all members of an organization"""
    return db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id
    ).options(joinedload(OrganizationMember.user)).all()


def is_organization_admin(db: Session, org_id: int, user_id: int) -> bool:
    """Check if user is an admin of the organization"""
    member = get_organization_member(db, org_id, user_id)
    return member is not None and member.role == OrgRole.ADMIN


def is_organization_member(db: Session, org_id: int, user_id: int) -> bool:
    """Check if user is a member of the organization"""
    return get_organization_member(db, org_id, user_id) is not None


def add_user_to_organization(
    db: Session,
    org_id: int,
    user_id: int,
    role: OrgRole = OrgRole.MEMBER,
    invited_by_id: Optional[int] = None
) -> Optional[OrganizationMember]:
    """
    Add user to organization

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User ID to add
        role: Role for the user (MEMBER or ADMIN)
        invited_by_id: ID of user who invited this user

    Returns:
        Created membership or None if user already in another org
    """
    # Check if user already in an organization
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if user.organization_id is not None:
        return None  # User already in an organization

    # Create membership
    membership = OrganizationMember(
        organization_id=org_id,
        user_id=user_id,
        role=role,
        invited_by_id=invited_by_id
    )
    db.add(membership)

    # Update user's organization_id
    user.organization_id = org_id

    db.commit()
    db.refresh(membership)

    return membership


def update_member_role(
    db: Session,
    org_id: int,
    user_id: int,
    new_role: OrgRole
) -> Optional[OrganizationMember]:
    """
    Update organization member's role

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User ID
        new_role: New role (MEMBER or ADMIN)

    Returns:
        Updated membership or None if not found
    """
    member = get_organization_member(db, org_id, user_id)
    if not member:
        return None

    member.role = new_role
    db.commit()
    db.refresh(member)

    return member


def remove_user_from_organization(
    db: Session,
    org_id: int,
    user_id: int
) -> bool:
    """
    Remove user from organization

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User ID to remove

    Returns:
        True if removed, False if not found
    """
    member = get_organization_member(db, org_id, user_id)
    if not member:
        return False

    # Update user's organization_id
    user = get_user_by_id(db, user_id)
    if user:
        user.organization_id = None

    # Update user's documents that are org-wide (set to private)
    db.query(Document).filter(
        and_(
            Document.uploaded_by_id == user_id,
            Document.visibility == 'organization'
        )
    ).update({Document.visibility: 'private', Document.organization_id: None})

    db.delete(member)
    db.commit()

    return True


def get_organization_admin_count(db: Session, org_id: int) -> int:
    """Get count of admins in organization"""
    return db.query(OrganizationMember).filter(
        and_(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.role == OrgRole.ADMIN
        )
    ).count()


# ===================================
# Organization Invite Operations
# ===================================

def create_organization_invite(
    db: Session,
    org_id: int,
    created_by_id: int,
    invite_type: str,
    email: Optional[str] = None,
    expires_at: Optional[datetime] = None,
    max_uses: Optional[int] = None
) -> OrganizationInvite:
    """
    Create organization invitation

    Args:
        db: Database session
        org_id: Organization ID
        created_by_id: ID of user creating invite
        invite_type: 'code' or 'email'
        email: Email address for email invitations
        expires_at: Optional expiration datetime
        max_uses: Optional maximum number of uses

    Returns:
        Created invitation
    """
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(OrganizationInvite).filter(
        OrganizationInvite.invite_code == invite_code
    ).first():
        invite_code = generate_invite_code()

    # Default expiration if not provided
    if expires_at is None and invite_type == 'code':
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=config.DEFAULT_INVITE_EXPIRY_DAYS
        )

    invite = OrganizationInvite(
        organization_id=org_id,
        invite_type=invite_type,
        email=email,
        invite_code=invite_code,
        created_by_id=created_by_id,
        expires_at=expires_at,
        max_uses=max_uses
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    return invite


def get_organization_invite_by_code(
    db: Session,
    invite_code: str
) -> Optional[OrganizationInvite]:
    """Get organization invite by code"""
    return db.query(OrganizationInvite).filter(
        OrganizationInvite.invite_code == invite_code
    ).first()


def get_organization_invite_by_id(
    db: Session,
    invite_id: int
) -> Optional[OrganizationInvite]:
    """Get organization invite by ID"""
    return db.query(OrganizationInvite).filter(
        OrganizationInvite.id == invite_id
    ).first()


def get_organization_invites(
    db: Session,
    org_id: int,
    active_only: bool = True
) -> List[OrganizationInvite]:
    """
    Get all invites for an organization

    Args:
        db: Database session
        org_id: Organization ID
        active_only: If True, only return active invites

    Returns:
        List of invitations
    """
    query = db.query(OrganizationInvite).filter(
        OrganizationInvite.organization_id == org_id
    )

    if active_only:
        query = query.filter(OrganizationInvite.is_active == True)

    return query.all()


def validate_and_use_invite(
    db: Session,
    invite_code: str,
    user_id: int
) -> tuple[bool, str, Optional[OrganizationInvite]]:
    """
    Validate invite code and mark as used

    Args:
        db: Database session
        invite_code: Invite code to validate
        user_id: ID of user trying to use invite

    Returns:
        Tuple of (success, message, invite)
    """
    invite = get_organization_invite_by_code(db, invite_code)

    if not invite:
        return False, "Invalid invite code", None

    if not invite.is_active:
        return False, "This invite has been revoked", None

    # Check expiration
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        return False, "This invite has expired", None

    # Check max uses
    if invite.max_uses and invite.used_count >= invite.max_uses:
        return False, "This invite has reached its maximum uses", None

    # Check if user already in an organization
    user = get_user_by_id(db, user_id)
    if user.organization_id:
        return False, "You are already a member of an organization", None

    # Increment used count
    invite.used_count += 1
    db.commit()

    return True, "Success", invite


def revoke_organization_invite(db: Session, invite_id: int) -> bool:
    """
    Revoke (deactivate) an organization invite

    Args:
        db: Database session
        invite_id: Invite ID

    Returns:
        True if revoked, False if not found
    """
    invite = db.query(OrganizationInvite).filter(
        OrganizationInvite.id == invite_id
    ).first()

    if not invite:
        return False

    invite.is_active = False
    db.commit()

    return True


def get_visible_groups(db: Session, user_id: int) -> List[UserGroup]:
    """
    Get groups visible to a user
    - Regular members see groups they're part of
    - Organization admins see ALL groups in their organization

    Args:
        db: Database session
        user_id: User ID

    Returns:
        List of visible groups
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return []

    # Get user's own groups (groups they're a member of)
    user_groups = get_user_groups_for_user(db, user_id)

    # If user is in an organization and is an admin, also get all org groups
    if user.organization_id:
        member = get_organization_member(db, user.organization_id, user_id)
        if member and member.role == OrgRole.ADMIN:
            # Get all groups in the organization
            org_groups = db.query(UserGroup).filter(
                UserGroup.organization_id == user.organization_id
            ).all()

            # Combine and deduplicate (using dict to preserve order and remove duplicates)
            all_groups_dict = {g.id: g for g in user_groups}
            all_groups_dict.update({g.id: g for g in org_groups})
            return list(all_groups_dict.values())

    return user_groups