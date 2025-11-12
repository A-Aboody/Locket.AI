# backend/main.py
"""
FastAPI main application
Document Retrieval System API with Enhanced Authentication
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import os
import uuid
import traceback
import logging

from config import config
from db_config import get_db
import schemas
import crud
import auth
import document_processing
from dependencies import get_current_user, require_admin, require_verified_email, require_admin_or_verified_email
from database_models import User, UserRole, UserStatus, Document
from email_service import email_service
from verification_service import verification_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Document Retrieval System API",
    description="API for document management and retrieval with semantic search and enhanced authentication",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security scheme for Swagger UI
security = HTTPBearer()

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Document Retrieval System API",
        "version": "2.0.0",
        "status": "online",
        "authentication": "Enhanced with email verification and 2FA"
    }


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with system status"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        database_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        database_healthy = False
    
    # Test email service
    email_healthy = email_service.enabled
    
    overall_status = "healthy" if database_healthy and email_healthy else "degraded"
    
    return {
        "status": overall_status,
        "environment": config.ENVIRONMENT,
        "database": database_healthy,
        "email_service": email_healthy,
        "timestamp": datetime.now(timezone.utc),
        "version": "2.0.0"
    }


# Enhanced Authentication routes

@app.post("/api/auth/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: schemas.UserRegister, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email verification
    """
    logger.info(f"Registration attempt for email: {user_data.email}, username: {user_data.username}")
    
    # Check if email already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        logger.warning(f"Registration failed - email already exists: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = crud.get_user_by_username(db, user_data.username)
    if existing_username:
        logger.warning(f"Registration failed - username already taken: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user (initially unverified)
    try:
        new_user = crud.create_user(db, user_data)
        logger.info(f"User created successfully: {new_user.id} - {new_user.username}")
    except Exception as e:
        logger.error(f"User creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )
    
    # Generate verification code
    verification_code = verification_service.create_verification_code(new_user.id, new_user.email)
    
    # Send verification email in background
    if verification_code:
        background_tasks.add_task(
            email_service.send_verification_code,
            new_user.email,
            verification_code
        )
        logger.info(f"Verification code generated and email queued for user: {new_user.id}")
    else:
        logger.error(f"Failed to generate verification code for user: {new_user.id}")
    
    # Create access token (limited permissions until verified)
    access_token = auth.create_access_token(
        data={"sub": str(new_user.id), "role": new_user.role.value, "verified": False}
    )
    
    return {
        "access_token": access_token,
        "user": new_user,
        "requires_verification": True,
        "message": "Registration successful. Please check your email for verification code."
    }


@app.post("/api/auth/verify-email", response_model=schemas.VerificationResponse)
def verify_email(
    verification_data: schemas.VerifyEmail, 
    db: Session = Depends(get_db)
):
    """
    Verify email address with verification code
    """
    logger.info(f"Email verification attempt for user: {verification_data.user_id}")
    
    # Verify the code
    is_valid = verification_service.verify_code(verification_data.user_id, verification_data.verification_code)
    
    if not is_valid:
        logger.warning(f"Invalid verification code for user: {verification_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Mark email as verified
    success = crud.verify_user_email(db, verification_data.user_id)
    if not success:
        logger.error(f"User not found during email verification: {verification_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get updated user
    user = crud.get_user_by_id(db, verification_data.user_id)
    logger.info(f"Email verified successfully for user: {user.id} - {user.email}")
    
    return {
        "message": "Email verified successfully",
        "user": user
    }


@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def login(
    credentials: schemas.UserLogin, 
    db: Session = Depends(get_db)
):
    """
    Login with email/username and password
    """
    logger.info(f"Login attempt for identifier: {credentials.email}")
    
    # Authenticate user by email or username
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        # Try username
        user_by_username = crud.get_user_by_username(db, credentials.email)
        if user_by_username:
            user = crud.authenticate_user(db, user_by_username.email, credentials.password)
    
    if not user:
        logger.warning(f"Login failed - invalid credentials for: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active:
        logger.warning(f"Login failed - account inactive for user: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Check if email is verified
    requires_verification = not user.email_verified
    
    # Create tokens
    access_token = auth.create_access_token(
        data={
            "sub": str(user.id), 
            "role": user.role.value, 
            "verified": user.email_verified
        },
        remember_me=credentials.remember_me
    )
    
    refresh_token = None
    if credentials.remember_me:
        refresh_token = auth.create_refresh_token(str(user.id))
    
    logger.info(f"Login successful for user: {user.id} - {user.username}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "requires_verification": requires_verification
    }


@app.post("/api/auth/refresh", response_model=schemas.AuthResponse)
def refresh_token(token_data: schemas.TokenRefresh):
    """
    Refresh access token using refresh token
    """
    logger.info("Token refresh attempt")
    
    new_access_token = auth.refresh_access_token(token_data.refresh_token)
    
    if not new_access_token:
        logger.warning("Token refresh failed - invalid refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    logger.info("Token refreshed successfully")
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@app.post("/api/auth/forgot-password", response_model=schemas.PasswordResetResponse)
async def forgot_password(
    forgot_data: schemas.ForgotPassword, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Request password reset
    """
    logger.info(f"Password reset request for email: {forgot_data.email}")
    
    user = crud.get_user_by_email(db, forgot_data.email)
    if not user:
        # Don't reveal whether email exists
        logger.info(f"Password reset request for non-existent email: {forgot_data.email}")
        return {
            "message": "If the email exists, a password reset link has been sent",
            "reset_token_sent": True
        }
    
    # Check if account is active
    if not user.is_active:
        logger.warning(f"Password reset failed - account inactive for user: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Generate reset token
    reset_token = verification_service.create_password_reset_token(user.id)
    
    # Send reset email in background
    email_sent = False
    if reset_token:
        background_tasks.add_task(
            email_service.send_password_reset,
            user.email,
            reset_token,
            user.id
        )
        email_sent = True
        logger.info(f"Password reset token generated and email queued for user: {user.id}")
    else:
        logger.error(f"Failed to generate reset token for user: {user.id}")
    
    return {
        "message": "If the email exists, a password reset link has been sent",
        "reset_token_sent": email_sent
    }


@app.post("/api/auth/reset-password", response_model=schemas.Message)
def reset_password(
    reset_data: schemas.ResetPassword, 
    db: Session = Depends(get_db)
):
    """
    Reset password using reset token
    """
    logger.info(f"Password reset attempt for user: {reset_data.user_id}")
    
    # Verify reset token
    is_valid = verification_service.verify_reset_token(reset_data.user_id, reset_data.reset_token)
    if not is_valid:
        logger.warning(f"Invalid reset token for user: {reset_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    success = crud.update_user_password(db, reset_data.user_id, reset_data.new_password)
    if not success:
        logger.error(f"User not found during password reset: {reset_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Mark token as used
    verification_service.mark_reset_token_used(reset_data.user_id, reset_data.reset_token)
    
    logger.info(f"Password reset successful for user: {reset_data.user_id}")
    
    return {"message": "Password reset successfully"}


@app.post("/api/auth/change-password", response_model=schemas.Message)
def change_password(
    password_data: schemas.ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user
    """
    logger.info(f"Password change attempt for user: {current_user.id}")
    
    # Verify current password
    if not crud.verify_password(password_data.current_password, current_user.hashed_password):
        logger.warning(f"Password change failed - incorrect current password for user: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    success = crud.update_user_password(db, current_user.id, password_data.new_password)
    if not success:
        logger.error(f"Password change failed - user not found: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    logger.info(f"Password changed successfully for user: {current_user.id}")
    
    return {"message": "Password changed successfully"}


@app.post("/api/auth/resend-verification", response_model=schemas.Message)
async def resend_verification(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend email verification code
    """
    logger.info(f"Resend verification request for user: {current_user.id}")
    
    if current_user.email_verified:
        logger.warning(f"Resend verification failed - email already verified for user: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Generate new verification code
    verification_code = verification_service.create_verification_code(current_user.id, current_user.email)
    
    # Send verification email in background
    if verification_code:
        background_tasks.add_task(
            email_service.send_verification_code,
            current_user.email,
            verification_code
        )
        logger.info(f"Verification code resent for user: {current_user.id}")
        return {"message": "Verification code sent successfully"}
    else:
        logger.error(f"Failed to generate verification code for user: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate verification code"
        )


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return current_user


@app.get("/api/auth/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    """
    Verify if token is valid
    """
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role.value,
            "email_verified": current_user.email_verified,
            "status": current_user.status.value
        }
    }


# User Management routes

@app.get("/api/users/search", response_model=List[schemas.UserResponse])
def search_users(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search users by username or email
    Requires authentication
    Both admins and regular users are excluded from their own search results
    Admins can see inactive users, regular users only see active users
    """
    if not query or len(query) < 2:
        return []

    is_admin = current_user.role == UserRole.ADMIN

    # Both admins and regular users exclude themselves from search results
    # Admins can see inactive users, regular users cannot
    exclude_user_id = current_user.id
    include_inactive = is_admin

    users = crud.search_users(
        db,
        query,
        exclude_user_id=exclude_user_id,
        include_inactive=include_inactive
    )
    return users


@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all users (Admin only)
    """
    users = db.query(User).all()
    return users


@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get user by ID (Admin only)
    """
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    update_data: schemas.AdminUserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update user (Admin only)
    """
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if update_data.username is not None:
        # Check if username is taken by another user
        existing = crud.get_user_by_username(db, update_data.username)
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = update_data.username
    
    if update_data.email is not None:
        # Check if email is taken by another user
        existing = crud.get_user_by_email(db, update_data.email)
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = update_data.email
    
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
    
    if update_data.role is not None:
        user.role = UserRole(update_data.role)
    
    if update_data.status is not None:
        user.status = UserStatus(update_data.status)
    
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    
    if update_data.email_verified is not None:
        user.email_verified = update_data.email_verified
    
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    return user


@app.post("/api/users/{user_id}/deactivate", response_model=schemas.Message)
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivate user account (Admin only)
    """
    success = crud.deactivate_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deactivated successfully"}


@app.post("/api/users/{user_id}/activate", response_model=schemas.Message)
def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Activate user account (Admin only)
    """
    success = crud.activate_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User activated successfully"}


# Document routes (Enhanced with verification requirements)

@app.post("/api/documents/upload", response_model=schemas.DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    visibility: str = Form("private"),
    user_group_id: Optional[int] = Form(None),
    current_user: User = Depends(require_verified_email),  # Require verified email for upload
    db: Session = Depends(get_db)
):
    """
    Upload a document with visibility settings
    
    Supported formats: PDF, TXT, DOCX, DOC
    Requires verified email address
    """
    logger.info(f"Document upload started by user: {current_user.username}, file: {file.filename}")
    
    import search_service
    
    # Validate file extension
    if not document_processing.is_allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported types: {', '.join(config.ALLOWED_EXTENSIONS)}"
        )
    
    # Validate visibility
    if visibility not in ['private', 'public', 'group']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid visibility setting"
        )
    
    # Validate group access if group visibility
    if visibility == 'group':
        if not user_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group ID required for group visibility"
            )
        
        # Check if user is member of the group
        if not crud.is_user_in_group(db, current_user.id, user_group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of the specified group"
            )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size
    if not document_processing.validate_file_size(file_size, config.MAX_UPLOAD_SIZE_MB):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {config.MAX_UPLOAD_SIZE_MB} MB"
        )
    
    # Generate unique filename
    file_extension = document_processing.get_file_extension(file.filename)
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(config.UPLOAD_DIR, unique_filename)
    
    # Save file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
        logger.info(f"File saved to: {file_path}")
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Extract text content
    try:
        content, page_count = document_processing.process_document(file_path, file.content_type or file_extension)
        logger.info(f"Extracted {len(content or '')} characters, {page_count} pages")
    except Exception as e:
        logger.error(f"Failed to process document: {e}")
        # Clean up file if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )
    
    # Generate embeddings for search
    try:
        index_data = search_service.reindex_document(
            document_id=0,
            content=content or "",
            filename=file.filename
        )
        embedding = index_data['embedding']
        content_preview = index_data['content_preview']
        logger.info(f"Generated embedding with {len(embedding)} dimensions")
    except Exception as e:
        logger.warning(f"Failed to generate embeddings: {e}")
        embedding = None
        content_preview = content[:500] if content else ""
    
    # Create database record
    try:
        document = Document(
            filename=file.filename,
            file_path=file_path,
            file_type=file.content_type or file_extension,
            file_size=file_size,
            content=content,
            page_count=page_count,
            embedding=embedding,
            content_preview=content_preview,
            uploaded_by_id=current_user.id,
            visibility=visibility,
            user_group_id=user_group_id if visibility == 'group' else None
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        logger.info(f"Document created with ID: {document.id}")
    except Exception as e:
        logger.error(f"Failed to create database record: {e}")
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document record: {str(e)}"
        )
    
    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "uploaded_at": document.uploaded_at,
        "visibility": document.visibility,
        "user_group_id": document.user_group_id,
        "message": "Document uploaded and indexed successfully"
    }


@app.get("/api/documents")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    user_only: bool = False
):
    """
    List documents - Can list all documents or only user's documents
    """
    if user_only:
        # Get only current user's documents
        documents = crud.get_user_documents(db, current_user.id, skip=skip, limit=limit)
    else:
        # Get all visible documents (respects visibility settings)
        documents = crud.get_visible_documents(db, current_user.id, skip=skip, limit=limit)
    
    # Add uploader username to each document
    result = []
    for doc in documents:
        doc_dict = {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "page_count": doc.page_count,
            "uploaded_at": doc.uploaded_at,
            "updated_at": doc.updated_at,
            "uploaded_by_id": doc.uploaded_by_id,
            "uploaded_by_username": doc.uploaded_by.username if doc.uploaded_by else "Unknown",
            "visibility": doc.visibility,
            "user_group_id": doc.user_group_id,
            "user_group_name": doc.user_group.name if doc.user_group else None
        }
        result.append(doc_dict)
    
    return result


@app.get("/api/documents/{document_id}", response_model=schemas.DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get document metadata by ID - Respects visibility settings
    Admins can view all documents
    """
    document = crud.get_document_by_id(db, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check visibility permissions (admins can see everything)
    if current_user.role != UserRole.ADMIN:
        if document.visibility == 'private' and document.uploaded_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this document"
            )

        if document.visibility == 'group':
            if not crud.is_user_in_group(db, current_user.id, document.user_group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view this group document"
                )
    
    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "page_count": document.page_count,
        "uploaded_at": document.uploaded_at,
        "updated_at": document.updated_at,
        "uploaded_by_id": document.uploaded_by_id,
        "uploaded_by_username": document.uploaded_by.username if document.uploaded_by else "Unknown",
        "visibility": document.visibility,
        "user_group_id": document.user_group_id,
        "user_group_name": document.user_group.name if document.user_group else None
    }


@app.get("/api/documents/{document_id}/content", response_model=schemas.DocumentContentResponse)
def get_document_content(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get document content by ID - Respects visibility settings
    Admins can view all documents
    """
    document = crud.get_document_by_id(db, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check visibility permissions (admins can see everything)
    if current_user.role != UserRole.ADMIN:
        if document.visibility == 'private' and document.uploaded_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this document"
            )

        if document.visibility == 'group':
            if not crud.is_user_in_group(db, current_user.id, document.user_group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view this group document"
                )
    
    return {
        "id": document.id,
        "filename": document.filename,
        "file_type": document.file_type,
        "content": document.content or "",
        "page_count": document.page_count
    }


@app.get("/api/documents/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download/view document file - Respects visibility settings
    Admins can download all documents
    """
    document = crud.get_document_by_id(db, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check visibility permissions (admins can see everything)
    if current_user.role != UserRole.ADMIN:
        if document.visibility == 'private' and document.uploaded_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to download this document"
            )

        if document.visibility == 'group':
            if not crud.is_user_in_group(db, current_user.id, document.user_group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to download this group document"
                )
    
    # Check if file exists
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Determine media type
    media_type = document.file_type or "application/octet-stream"
    
    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        filename=document.filename,
        headers={
            "Content-Disposition": f'inline; filename="{document.filename}"'
        }
    )


@app.delete("/api/documents/{document_id}", response_model=schemas.Message)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a document - Only owner or admin can delete
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check ownership (admin can delete all)
    if current_user.role != UserRole.ADMIN and document.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this document"
        )
    
    # Delete file from disk
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")
    
    # Delete database record
    crud.delete_document(db, document_id)
    
    return {"message": "Document deleted successfully"}


@app.put("/api/documents/{document_id}/visibility", response_model=schemas.DocumentResponse)
def update_document_visibility(
    document_id: int,
    visibility_data: schemas.DocumentVisibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update document visibility - Add document to a user group or change visibility

    - Regular users can only update documents they uploaded
    - Admin can update any public document
    - When adding to a group, user must be a member of that group (or admin)
    - Automatically updates visibility to 'group' when adding to a group
    """
    document = crud.get_document_by_id(db, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check permissions
    is_owner = document.uploaded_by_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    is_public_doc = document.visibility == 'public'

    # Regular users can only update their own documents
    # Admin can update any public document or their own documents
    if not is_owner and not (is_admin and is_public_doc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add documents you uploaded to groups. Admins can add any public document."
        )

    # Validate group access if changing to group visibility
    if visibility_data.visibility == 'group':
        if not visibility_data.user_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group ID required for group visibility"
            )

        # Check if group exists
        group = crud.get_user_group_by_id(db, visibility_data.user_group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        # Check if user is member of the group (or admin)
        if not is_admin and not crud.is_user_in_group(db, current_user.id, visibility_data.user_group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of the group to add documents to it"
            )

    # Update document visibility
    updated_document = crud.update_document_visibility(
        db,
        document_id,
        visibility_data.visibility,
        visibility_data.user_group_id
    )

    if not updated_document:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document visibility"
        )

    return {
        "id": updated_document.id,
        "filename": updated_document.filename,
        "file_type": updated_document.file_type,
        "file_size": updated_document.file_size,
        "page_count": updated_document.page_count,
        "uploaded_at": updated_document.uploaded_at,
        "updated_at": updated_document.updated_at,
        "uploaded_by_id": updated_document.uploaded_by_id,
        "uploaded_by_username": updated_document.uploaded_by.username if updated_document.uploaded_by else "Unknown",
        "visibility": updated_document.visibility,
        "user_group_id": updated_document.user_group_id,
        "user_group_name": updated_document.user_group.name if updated_document.user_group else None
    }


# Search routes

@app.post("/api/search", response_model=schemas.SearchResponse)
def search_documents(
    search_query: schemas.SearchQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search documents using AI-powered semantic search
    """
    logger.info(f"Search request from user {current_user.username}: '{search_query.query}'")
    
    import time
    import search_service
    
    start_time = time.time()
    
    try:
        # Get all visible documents for this user
        documents = crud.get_all_documents_for_search(db, current_user.id)
        logger.info(f"Found {len(documents)} visible documents for search")
        
        # Check if any documents have embeddings
        docs_with_embeddings = sum(1 for doc in documents if doc.get('embedding'))
        logger.info(f"Documents with embeddings: {docs_with_embeddings}/{len(documents)}")
        
        if docs_with_embeddings == 0:
            logger.warning("No documents have embeddings! Search results will be poor.")
        
        # Rank by relevance
        ranked_results = search_service.rank_search_results(
            query=search_query.query,
            documents=documents,
            min_score=search_query.min_score
        )
        logger.info(f"Found {len(ranked_results)} results above threshold")
        
        # Limit results
        ranked_results = ranked_results[:search_query.limit]
        
        # Calculate search time
        search_time_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Search completed in {search_time_ms:.2f}ms, returning {len(ranked_results)} results")
        
        return {
            "query": search_query.query,
            "total_results": len(ranked_results),
            "results": ranked_results,
            "search_time_ms": round(search_time_ms, 2)
        }
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )
    
@app.post("/api/search/text", response_model=Dict)
def search_document_text(
    document_id: int,
    query: str,
    case_sensitive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fast text search within a single document
    Returns match positions for client-side highlighting
    """
    logger.info(f"Text search in document {document_id} by user {current_user.username}: '{query}'")
    
    if not query or len(query) < 2:
        return {
            "matches": [],
            "total": 0,
            "message": "Query too short"
        }
    
    # Check document access
    if not crud.can_user_access_document(db, current_user.id, document_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this document"
        )
    
    # Get document content
    document = crud.get_document_by_id(db, document_id)
    if not document or not document.content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document content not available"
        )
    
    import re
    import time
    
    start_time = time.time()
    
    try:
        # Escape special regex characters but allow wildcards
        escaped_query = re.escape(query)
        
        # Create regex with optional case sensitivity
        flags = 0 if case_sensitive else re.IGNORECASE
        pattern = re.compile(escaped_query, flags)
        
        matches = []
        match_index = 0
        for match in pattern.finditer(document.content):
            start = match.start()
            end = match.end()
            
            # Extract context (50 chars before and after)
            context_start = max(0, start - 50)
            context_end = min(len(document.content), end + 50)
            context = document.content[context_start:context_end]
            
            # Add ellipsis if truncated
            if context_start > 0:
                context = '...' + context
            if context_end < len(document.content):
                context = context + '...'
            
            matches.append({
                "index": match_index,
                "start": start,
                "end": end,
                "text": match.group(0),
                "context": context
            })
            match_index += 1
        
        search_time_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Text search completed in {search_time_ms:.2f}ms, found {len(matches)} matches")
        
        return {
            "matches": matches,
            "total": len(matches),
            "search_time_ms": round(search_time_ms, 2),
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Text search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@app.post("/api/documents/reindex", response_model=schemas.Message)
def reindex_all_documents(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Reindex all documents with embeddings (Admin only)
    """
    logger.info(f"Document reindexing started by admin: {current_user.username}")
    
    import search_service
    
    documents = db.query(Document).all()
    logger.info(f"Found {len(documents)} documents to reindex")
    
    indexed_count = 0
    for doc in documents:
        try:
            # Generate embedding
            index_data = search_service.reindex_document(
                document_id=doc.id,
                content=doc.content or "",
                filename=doc.filename
            )
            
            # Update in database
            crud.update_document_embedding(
                db=db,
                document_id=doc.id,
                embedding=index_data['embedding'],
                preview=index_data['content_preview']
            )
            
            indexed_count += 1
        except Exception as e:
            logger.error(f"Failed to index document {doc.id}: {e}")
            continue
    
    message = f"Successfully indexed {indexed_count} of {len(documents)} documents"
    logger.info(f"Reindexing completed: {message}")
    
    return {"message": message}


# User Group Routes

@app.post("/api/user-groups", response_model=schemas.UserGroupResponse)
def create_user_group(
    group_data: schemas.UserGroupCreate,
    current_user: User = Depends(require_verified_email),  # Require verified email
    db: Session = Depends(get_db)
):
    """
    Create a new user group
    Requires verified email address
    """
    # Validate that all member IDs exist
    for user_id in group_data.member_ids:
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with ID {user_id} not found"
            )
    
    group = crud.create_user_group(db, group_data, current_user.id)
    
    # Format the response to include user details
    return format_user_group_response(group)


@app.get("/api/user-groups", response_model=List[schemas.UserGroupResponse])
def get_user_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all user groups that the current user is member of
    """
    groups = crud.get_user_groups_for_user(db, current_user.id)
    
    # Format each group response
    formatted_groups = []
    for group in groups:
        formatted_groups.append(format_user_group_response(group))
    
    return formatted_groups


@app.get("/api/user-groups/{group_id}", response_model=schemas.UserGroupResponse)
def get_user_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get specific user group (must be member)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if user is member of the group
    if not crud.is_user_in_group(db, current_user.id, group_id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )

    return format_user_group_response(group)


@app.put("/api/user-groups/{group_id}", response_model=schemas.UserGroupResponse)
def update_user_group(
    group_id: int,
    update_data: schemas.UserGroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user group details (creator only)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if user is the creator
    if group.created_by_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator can update group details"
        )

    updated_group = crud.update_user_group(db, group_id, update_data)
    return format_user_group_response(updated_group)


@app.delete("/api/user-groups/{group_id}", response_model=schemas.Message)
def delete_user_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user group (creator only)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if user is the creator
    if group.created_by_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator can delete the group"
        )

    success = crud.delete_user_group(db, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete group"
        )

    return {"message": "Group deleted successfully"}


@app.post("/api/user-groups/{group_id}/members", response_model=schemas.Message)
def add_group_member(
    group_id: int,
    member_data: schemas.AddGroupMember,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add member to user group (must be a member)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if current user is a member
    if not crud.is_user_in_group(db, current_user.id, group_id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member to add others"
        )

    # Check if user to add exists
    user_to_add = crud.get_user_by_id(db, member_data.user_id)
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Add member
    success = crud.add_user_to_group(db, member_data.user_id, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )

    return {"message": f"{user_to_add.username} added to group successfully"}


@app.delete("/api/user-groups/{group_id}/members/{user_id}", response_model=schemas.Message)
def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove member from user group (creator only or self)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Allow if user is removing themselves or if user is creator/admin
    is_self_removal = user_id == current_user.id
    is_creator = group.created_by_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_self_removal or is_creator or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator can remove other members"
        )

    # Remove member
    success = crud.remove_user_from_group(db, user_id, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove group creator or user is not a member"
        )

    return {"message": "Member removed successfully"}


@app.get("/api/user-groups/{group_id}/stats")
def get_group_stats(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics for a user group
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if user is member of the group
    if not crud.is_user_in_group(db, current_user.id, group_id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )

    stats = crud.get_group_statistics(db, group_id)
    return stats


@app.get("/api/user-groups/{group_id}/documents")
def get_group_documents(
    group_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all documents in a user group
    Only group members can view group documents
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Check if user is member of the group
    if not crud.is_user_in_group(db, current_user.id, group_id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )

    documents = crud.get_group_documents(db, group_id, skip=skip, limit=limit)

    # Format response
    formatted_docs = []
    for doc in documents:
        formatted_docs.append({
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "page_count": doc.page_count,
            "uploaded_at": doc.uploaded_at,
            "uploaded_by_id": doc.uploaded_by_id,
            "uploaded_by_username": doc.uploaded_by.username if doc.uploaded_by else "Unknown",
            "visibility": doc.visibility,
            "user_group_id": doc.user_group_id,
            "user_group_name": doc.user_group.name if doc.user_group else None
        })

    return formatted_docs


# Add cleanup endpoint (admin only)
@app.post("/api/auth/cleanup-tokens", response_model=schemas.Message)
def cleanup_expired_tokens(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Clean up expired verification codes and reset tokens (Admin only)
    """
    stats = verification_service.cleanup_expired_tokens()
    
    return {
        "message": f"Cleaned up {stats['expired_codes_cleaned']} expired codes and {stats['expired_tokens_cleaned']} expired tokens"
    }


# Helper function to format user group response
def format_user_group_response(group):
    """Format user group response with member details"""
    formatted_members = []
    
    # Add creator as first member
    if group.creator:
        formatted_members.append({
            "user_id": group.creator.id,
            "username": group.creator.username,
            "email": group.creator.email,
            "joined_at": group.created_at
        })
    
    # Add other members
    for member in group.members:
        if member.user and member.user.id != group.created_by_id:  # Don't duplicate creator
            formatted_members.append({
                "user_id": member.user.id,
                "username": member.user.username,
                "email": member.user.email,
                "joined_at": member.joined_at
            })
    
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "created_by_id": group.created_by_id,
        "created_at": group.created_at,
        "members": formatted_members,
        "creator_username": group.creator.username if group.creator else None
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for logging"""
    logger.error(f"Global exception handler: {str(exc)}")
    logger.error(f"Request: {request.method} {request.url}")
    logger.error(f"Exception type: {type(exc).__name__}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Run the application
if __name__ == "__main__":
    import uvicorn
    
    # Display startup information
    print("\n" + "="*60)
    print("  Document Retrieval System API - Enhanced Authentication")
    print("="*60)
    print(f"Environment: {config.ENVIRONMENT}")
    print(f"Debug Mode: {config.DEBUG}")
    print(f"Host: {config.HOST}:{config.PORT}")
    print(f"Database: Connected")
    print(f"Email Service: {'Enabled' if email_service.enabled else 'Disabled'}")
    print(f"CORS Origins: {', '.join(config.CORS_ORIGINS)}")
    print("="*60 + "\n")
    
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level="info"
    )