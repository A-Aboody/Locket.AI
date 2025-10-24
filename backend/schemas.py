"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime


class UserRegister(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (without password)"""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class Message(BaseModel):
    """Schema for generic message response"""
    message: str


# Document Schemas

class DocumentUploadResponse(BaseModel):
    """Schema for document upload response"""
    id: int
    filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    message: str
    
    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    """Schema for document metadata response"""
    id: int
    filename: str
    file_type: str
    file_size: int
    page_count: int
    uploaded_at: datetime
    updated_at: datetime
    uploaded_by_id: int
    uploaded_by_username: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Schema for document list with uploader info"""
    id: int
    filename: str
    file_type: str
    file_size: int
    page_count: int
    uploaded_at: datetime
    uploader_username: str
    
    class Config:
        from_attributes = True


class DocumentContentResponse(BaseModel):
    """Schema for document content retrieval"""
    id: int
    filename: str
    file_type: str
    content: str
    page_count: int


# Search Schemas

class SearchQuery(BaseModel):
    """Schema for search query"""
    query: str = Field(..., min_length=1, max_length=500)
    min_score: Optional[float] = Field(default=0.1, ge=0.0, le=1.0)
    limit: Optional[int] = Field(default=20, ge=1, le=100)


class ScoreBreakdown(BaseModel):
    """Schema for score breakdown"""
    semantic: float
    keyword: float
    fuzzy: float
    filename: float
    total: float


class SearchResult(BaseModel):
    """Schema for individual search result"""
    id: int
    filename: str
    file_type: str
    file_size: int
    page_count: int
    uploaded_at: datetime
    uploaded_by_username: str
    relevance_score: float
    score_breakdown: ScoreBreakdown
    snippet: str


class SearchResponse(BaseModel):
    """Schema for search response"""
    query: str
    total_results: int
    results: List[SearchResult]
    search_time_ms: float