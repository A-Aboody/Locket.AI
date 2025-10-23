"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
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
    uploaded_by_username: Optional[str] = None  # Add uploader username
    
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