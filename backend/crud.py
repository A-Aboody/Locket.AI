# backend/crud.py
"""
CRUD operations for database
"""

import bcrypt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from database_models import User, UserRole, UserStatus, Document, UserGroup, UserGroupMember, VerificationCode, PasswordResetToken
from schemas import UserRegister
from typing import Optional, List, Dict
from datetime import datetime, timezone


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

    return db.query(Document).options(
        joinedload(Document.uploaded_by),
        joinedload(Document.user_group)
    ).filter(
        or_(
            # Public documents
            Document.visibility == 'public',
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
        )
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
        return True
    
    if document.visibility == 'private':
        return document.uploaded_by_id == user_id
    
    if document.visibility == 'group':
        return is_user_in_group(db, user_id, document.user_group_id)
    
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