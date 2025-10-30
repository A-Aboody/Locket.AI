"""
FastAPI main application
Document Retrieval System API
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
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

@app.get("/api/users", response_model=list[schemas.UserResponse])
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a document
    
    Supported formats: PDF, TXT, DOCX, DOC
    """
    print(f"[DEBUG] Upload started by user: {current_user.username}")
    print(f"[DEBUG] File: {file.filename}")
    
    import search_service
    
    # Validate file extension
    if not document_processing.is_allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported types: {', '.join(config.ALLOWED_EXTENSIONS)}"
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
            uploaded_by_id=current_user.id
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
        # Get all documents (default behavior)
        documents = crud.get_all_documents(db, skip=skip, limit=limit)
    
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
            "uploaded_by_username": doc.uploaded_by.username if doc.uploaded_by else "Unknown"
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
    Get document metadata by ID - Everyone can view all documents
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
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
        "uploaded_by_username": document.uploaded_by.username if document.uploaded_by else "Unknown"
    }


@app.get("/api/documents/{document_id}/content", response_model=schemas.DocumentContentResponse)
def get_document_content(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get document content by ID - Everyone can view all documents
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
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
    Download/view document file - Everyone can view all documents
    """
    document = crud.get_document_by_id(db, document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
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
        # Get all documents
        print(f"[SEARCH] Fetching documents from database...")
        documents = crud.get_all_documents_for_search(db)
        print(f"[SEARCH] Found {len(documents)} documents")
        
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


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )