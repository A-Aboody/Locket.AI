"""
FastAPI main application
Document Retrieval System API
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import os
import uuid
import traceback

from config import config
from db_config import get_db
import schemas
import crud
import auth
import document_processing
from dependencies import get_current_user, require_admin
from database_models import User, UserRole, Document

# Create FastAPI app
app = FastAPI(
    title="Document Retrieval System API",
    description="API for document management and retrieval with semantic search",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Document Retrieval System API",
        "version": "1.0.0",
        "status": "online"
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": config.ENVIRONMENT
    }


# Authentication routes

@app.post("/api/auth/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    # Check if email already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = crud.get_user_by_username(db, user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    new_user = crud.create_user(db, user_data)
    
    # Create access token
    access_token = auth.create_access_token(
        data={"sub": str(new_user.id), "role": new_user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/api/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password
    """
    # Authenticate user
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login with timezone-aware datetime
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = auth.create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


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
            "role": current_user.role.value
        }
    }


# User routes

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


# Document routes

@app.post("/api/documents/upload", response_model=schemas.DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    visibility: str = Form("private"),
    user_group_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a document with visibility settings
    
    Supported formats: PDF, TXT, DOCX, DOC
    """
    print(f"[DEBUG] Upload started by user: {current_user.username}")
    print(f"[DEBUG] File: {file.filename}")
    print(f"[DEBUG] Visibility: {visibility}")
    print(f"[DEBUG] Group ID: {user_group_id}")
    
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
        print(f"[DEBUG] File saved to: {file_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Extract text content
    try:
        print(f"[DEBUG] Extracting text content...")
        content, page_count = document_processing.process_document(file_path, file.content_type or file_extension)
        print(f"[DEBUG] Extracted {len(content or '')} characters, {page_count} pages")
    except Exception as e:
        print(f"[ERROR] Failed to process document: {e}")
        # Clean up file if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )
    
    # Generate embeddings for search
    try:
        print(f"[DEBUG] Generating embeddings...")
        index_data = search_service.reindex_document(
            document_id=0,
            content=content or "",
            filename=file.filename
        )
        embedding = index_data['embedding']
        content_preview = index_data['content_preview']
        print(f"[DEBUG] Generated embedding with {len(embedding)} dimensions")
    except Exception as e:
        print(f"[WARNING] Failed to generate embeddings: {e}")
        print(f"[WARNING] {traceback.format_exc()}")
        embedding = None
        content_preview = content[:500] if content else ""
    
    # Create database record
    try:
        print(f"[DEBUG] Creating database record...")
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
        print(f"[DEBUG] Document created with ID: {document.id}")
    except Exception as e:
        print(f"[ERROR] Failed to create database record: {e}")
        print(f"[ERROR] {traceback.format_exc()}")
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
    user_only: bool = False  # Add this parameter to filter by user
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
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check visibility permissions
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
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check visibility permissions
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
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check visibility permissions
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
        print(f"[WARNING] Failed to delete file: {e}")
    
    # Delete database record
    crud.delete_document(db, document_id)
    
    return {"message": "Document deleted successfully"}


# Search routes

@app.post("/api/search", response_model=schemas.SearchResponse)
def search_documents(
    search_query: schemas.SearchQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search documents using AI-powered semantic search
    
    Supports:
    - Semantic similarity (understands meaning)
    - Keyword matching (exact term matches)
    - Fuzzy matching (handles typos)
    - Filename relevance
    """
    print("\n" + "="*60)
    print(f"[SEARCH] New search request")
    print(f"[SEARCH] User: {current_user.username}")
    print(f"[SEARCH] Query: '{search_query.query}'")
    print(f"[SEARCH] Min score: {search_query.min_score}")
    print(f"[SEARCH] Limit: {search_query.limit}")
    print("="*60)
    
    import time
    import search_service
    
    start_time = time.time()
    
    try:
        # Get all visible documents for this user
        print(f"[SEARCH] Fetching documents from database...")
        documents = crud.get_all_documents_for_search(db, current_user.id)
        print(f"[SEARCH] Found {len(documents)} visible documents")
        
        # Check if any documents have embeddings
        docs_with_embeddings = sum(1 for doc in documents if doc.get('embedding'))
        print(f"[SEARCH] Documents with embeddings: {docs_with_embeddings}/{len(documents)}")
        
        if docs_with_embeddings == 0:
            print(f"[WARNING] No documents have embeddings! Search results will be poor.")
            print(f"[WARNING] Run 'python index_documents.py' to generate embeddings")
        
        # Rank by relevance
        print(f"[SEARCH] Ranking documents by relevance...")
        ranked_results = search_service.rank_search_results(
            query=search_query.query,
            documents=documents,
            min_score=search_query.min_score
        )
        print(f"[SEARCH] Found {len(ranked_results)} results above threshold")
        
        # Limit results
        ranked_results = ranked_results[:search_query.limit]
        
        # Calculate search time
        search_time_ms = (time.time() - start_time) * 1000
        
        print(f"[SEARCH] Search completed in {search_time_ms:.2f}ms")
        print(f"[SEARCH] Returning {len(ranked_results)} results")
        
        # Debug: Show top 3 results
        for i, result in enumerate(ranked_results[:3], 1):
            print(f"[SEARCH]   {i}. {result['filename']} - Score: {result['relevance_score']:.2%}")
        
        print("="*60 + "\n")
        
        return {
            "query": search_query.query,
            "total_results": len(ranked_results),
            "results": ranked_results,
            "search_time_ms": round(search_time_ms, 2)
        }
        
    except Exception as e:
        print(f"[ERROR] Search failed!")
        print(f"[ERROR] Exception type: {type(e).__name__}")
        print(f"[ERROR] Exception message: {str(e)}")
        print(f"[ERROR] Traceback:")
        print(traceback.format_exc())
        print("="*60 + "\n")
        
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
    
    This generates AI embeddings for all documents to enable semantic search
    """
    print(f"[REINDEX] Starting reindex by {current_user.username}")
    
    import search_service
    
    documents = db.query(Document).all()
    print(f"[REINDEX] Found {len(documents)} documents to reindex")
    
    indexed_count = 0
    for doc in documents:
        try:
            print(f"[REINDEX] Processing: {doc.filename}...", end=" ")
            
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
            
            print("SUCCESS")
            indexed_count += 1
        except Exception as e:
            print(f"FAILED - {e}")
            continue
    
    message = f"Successfully indexed {indexed_count} of {len(documents)} documents"
    print(f"[REINDEX] {message}")
    
    return {"message": message}


# User Group Routes

@app.post("/api/user-groups", response_model=schemas.UserGroupResponse)
def create_user_group(
    group_data: schemas.UserGroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user group
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
    Update user group (only creator can update)
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
            detail="Only group creator can update the group"
        )
    
    updated_group = crud.update_user_group(db, group_id, update_data)
    if not updated_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return format_user_group_response(updated_group)


@app.post("/api/user-groups/{group_id}/members/{user_id}")
def add_member_to_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a user to a group (only members can add others)
    """
    # Check if current user is member of the group
    if not crud.is_user_in_group(db, current_user.id, group_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    # Check if target user exists
    target_user = crud.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = crud.add_user_to_group(db, user_id, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already in the group"
        )
    
    return {"message": "User added to group successfully"}


@app.delete("/api/user-groups/{group_id}/members/{user_id}")
def remove_member_from_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a user from a group
    """
    # Users can remove themselves, creators can remove anyone
    if user_id != current_user.id:
        group = crud.get_user_group_by_id(db, group_id)
        if not group or group.created_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creator can remove other members"
            )
    
    success = crud.remove_user_from_group(db, user_id, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove user from group"
        )
    
    return {"message": "User removed from group successfully"}


@app.delete("/api/user-groups/{group_id}")
def delete_user_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user group (only creator or admin)
    """
    group = crud.get_user_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is creator or admin
    if group.created_by_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator or admin can delete the group"
        )
    
    success = crud.delete_user_group(db, group_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return {"message": "Group deleted successfully"}


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
    
    # Get group statistics
    stats = crud.get_group_statistics(db, group_id)
    
    return stats


@app.get("/api/users/search")
def search_users(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search users by username or email
    """
    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 2 characters long"
        )
    
    users = crud.search_users(db, query, exclude_user_id=current_user.id)
    return users


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


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )