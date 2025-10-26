"""
CRUD operations for database
"""

import bcrypt
from sqlalchemy.orm import Session, joinedload
from database_models import User, UserRole, Document
from schemas import UserRegister
from typing import Optional, List, Dict


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


# Document CRUD Operations

def create_document(
    db: Session,
    filename: str,
    file_path: str,
    file_type: str,
    file_size: int,
    content: Optional[str],
    page_count: int,
    user_id: int
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
        uploaded_by_id=user_id
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


def get_document_by_id(db: Session, document_id: int) -> Optional[Document]:
    """Get document by ID with uploader info"""
    return db.query(Document).options(
        joinedload(Document.uploaded_by)
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
        joinedload(Document.uploaded_by)
    ).filter(
        Document.uploaded_by_id == user_id
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
        joinedload(Document.uploaded_by)
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


def get_all_documents_for_search(db: Session) -> List[Dict]:
    """
    Get all documents with necessary fields for search
    
    Args:
        db: Database session
    
    Returns:
        List of document dictionaries
    """
    documents = db.query(Document).options(
        joinedload(Document.uploaded_by)
    ).all()
    
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
            'uploaded_by_username': doc.uploaded_by.username if doc.uploaded_by else "Unknown"
        })
    
    return result