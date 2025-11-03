# backend/schemas.py
"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
import re


class UserRegister(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, description="Password with at least 6 characters")
    full_name: Optional[str] = Field(None, max_length=100, description="User's full name")

    @validator('username')
    def username_alphanumeric(cls, v):
        """Validate username contains only alphanumeric characters and underscores"""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v

    @validator('password')
    def password_strength(cls, v):
        """Basic password strength validation"""
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        # Add more strength checks if needed
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    email: str = Field(..., description="Email or username")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(default=False, description="Remember me for longer session")


class VerifyEmail(BaseModel):
    """Schema for email verification"""
    user_id: int = Field(..., description="User ID to verify")
    verification_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

    @validator('verification_code')
    def code_numeric(cls, v):
        """Validate verification code contains only digits"""
        if not v.isdigit():
            raise ValueError('Verification code must contain only numbers')
        return v


class ForgotPassword(BaseModel):
    """Schema for forgot password request"""
    email: str = Field(..., description="Email address associated with the account")


class ResetPassword(BaseModel):
    """Schema for password reset"""
    user_id: int = Field(..., description="User ID")
    reset_token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=6, description="New password")

    @validator('new_password')
    def password_strength(cls, v):
        """Basic password strength validation"""
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class ChangePassword(BaseModel):
    """Schema for changing password"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, description="New password")

    @validator('new_password')
    def password_strength(cls, v):
        """Basic password strength validation"""
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class TokenRefresh(BaseModel):
    """Schema for token refresh"""
    refresh_token: str = Field(..., description="Refresh token")


class UserResponse(BaseModel):
    """Schema for user response (without password)"""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    status: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    last_password_change: Optional[datetime]

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Enhanced authentication response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse
    requires_verification: bool = False
    message: Optional[str] = None

    class Config:
        from_attributes = True


class VerificationResponse(BaseModel):
    """Verification response"""
    message: str
    user: UserResponse


class PasswordResetResponse(BaseModel):
    """Password reset response"""
    message: str
    reset_token_sent: bool


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
    visibility: str
    user_group_id: Optional[int] = None
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
    visibility: str
    user_group_id: Optional[int] = None
    user_group_name: Optional[str] = None

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
    visibility: str
    user_group_id: Optional[int] = None
    user_group_name: Optional[str] = None

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
    visibility: str
    user_group_id: Optional[int] = None
    user_group_name: Optional[str] = None


class SearchResponse(BaseModel):
    """Schema for search response"""
    query: str
    total_results: int
    results: List[SearchResult]
    search_time_ms: float


# User Group Schemas

class UserGroupCreate(BaseModel):
    """Schema for creating a user group"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    member_ids: List[int] = Field(default=[], description="List of user IDs to add as members")

    @validator('name')
    def name_not_empty(cls, v):
        """Validate group name is not empty"""
        if not v.strip():
            raise ValueError('Group name cannot be empty')
        return v.strip()


class UserGroupUpdate(BaseModel):
    """Schema for updating a user group"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

    @validator('name')
    def name_not_empty(cls, v):
        """Validate group name is not empty"""
        if v is not None and not v.strip():
            raise ValueError('Group name cannot be empty')
        return v.strip() if v else v


class UserGroupMemberResponse(BaseModel):
    """Schema for user group member response"""
    user_id: int
    username: str
    email: str
    joined_at: datetime

    class Config:
        from_attributes = True


class UserGroupResponse(BaseModel):
    """Schema for user group response"""
    id: int
    name: str
    description: Optional[str]
    created_by_id: int
    created_at: datetime
    members: List[UserGroupMemberResponse] = []
    creator_username: Optional[str] = None

    class Config:
        from_attributes = True


class UserGroupSimpleResponse(BaseModel):
    """Schema for simplified user group response"""
    id: int
    name: str
    description: Optional[str]
    member_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class GroupMemberAdd(BaseModel):
    """Schema for adding a member to a group"""
    user_id: int = Field(..., description="User ID to add to the group")


# Alias for consistency
AddGroupMember = GroupMemberAdd


class GroupStatistics(BaseModel):
    """Schema for group statistics"""
    member_count: int
    document_count: int
    last_activity: Optional[datetime] = None
    created_at: datetime


class UserGroupWithStatsResponse(BaseModel):
    """Schema for user group response with statistics"""
    id: int
    name: str
    description: Optional[str]
    created_by_id: int
    created_at: datetime
    members: List[UserGroupMemberResponse] = []
    creator_username: Optional[str] = None
    statistics: GroupStatistics

    class Config:
        from_attributes = True


class VisibilityStats(BaseModel):
    """Schema for document visibility statistics"""
    private: int
    public: int
    group: int
    total: int


class UserSearchResult(BaseModel):
    """Schema for user search result"""
    id: int
    username: str
    email: str
    full_name: Optional[str]

    class Config:
        from_attributes = True


class DocumentVisibilityUpdate(BaseModel):
    """Schema for updating document visibility"""
    visibility: str = Field(..., pattern='^(private|public|group)$')
    user_group_id: Optional[int] = None

    @validator('user_group_id')
    def validate_group_id(cls, v, values):
        """Validate group ID is provided when visibility is 'group'"""
        if values.get('visibility') == 'group' and v is None:
            raise ValueError('user_group_id is required when visibility is "group"')
        return v


class GroupDocumentResponse(BaseModel):
    """Schema for group document response"""
    id: int
    filename: str
    file_type: str
    file_size: int
    page_count: int
    uploaded_at: datetime
    uploaded_by_username: str
    visibility: str

    class Config:
        from_attributes = True


class UserGroupsListResponse(BaseModel):
    """Schema for listing user groups with basic info"""
    groups: List[UserGroupSimpleResponse]
    total_count: int


class GroupMembersListResponse(BaseModel):
    """Schema for listing group members"""
    members: List[UserGroupMemberResponse]
    total_count: int


class UserStatistics(BaseModel):
    """Schema for user statistics"""
    document_count: int
    group_count: int
    last_activity: Optional[datetime] = None
    account_created: datetime
    last_login: Optional[datetime] = None


class VerificationCodeResponse(BaseModel):
    """Schema for verification code response"""
    id: int
    user_id: int
    email: str
    code: str
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordResetTokenResponse(BaseModel):
    """Schema for password reset token response"""
    id: int
    user_id: int
    token: str
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Schema for admin user updates"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, pattern='^(user|admin)$')
    status: Optional[str] = Field(None, pattern='^(pending|active|suspended|deleted)$')
    is_active: Optional[bool] = None
    email_verified: Optional[bool] = None

    @validator('username')
    def username_alphanumeric(cls, v):
        """Validate username contains only alphanumeric characters and underscores"""
        if v is not None and not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v


class BulkOperationResponse(BaseModel):
    """Schema for bulk operation responses"""
    success_count: int
    failure_count: int
    errors: List[str] = []


class SystemHealthResponse(BaseModel):
    """Schema for system health check"""
    status: str
    database: bool
    email_service: bool
    environment: str
    timestamp: datetime
    version: str


class AuditLogEntry(BaseModel):
    """Schema for audit log entry"""
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: Optional[Dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    """Base schema for paginated responses"""
    page: int
    page_size: int
    total_count: int
    total_pages: int
    has_next: bool
    has_previous: bool


class PaginatedUsersResponse(PaginatedResponse):
    """Schema for paginated users response"""
    users: List[UserResponse]


class PaginatedDocumentsResponse(PaginatedResponse):
    """Schema for paginated documents response"""
    documents: List[DocumentResponse]


class PaginatedGroupsResponse(PaginatedResponse):
    """Schema for paginated groups response"""
    groups: List[UserGroupSimpleResponse]


class EmailTemplate(BaseModel):
    """Schema for email template"""
    subject: str
    body: str
    template_type: str = Field(..., pattern='^(verification|password_reset|welcome|notification)$')


class NotificationPreferences(BaseModel):
    """Schema for user notification preferences"""
    email_notifications: bool = Field(default=True)
    document_uploads: bool = Field(default=True)
    group_activities: bool = Field(default=True)
    security_alerts: bool = Field(default=True)


class UserProfileUpdate(BaseModel):
    """Schema for user profile updates"""
    full_name: Optional[str] = Field(None, max_length=100)
    notification_preferences: Optional[NotificationPreferences] = None


class TwoFactorSetup(BaseModel):
    """Schema for 2FA setup"""
    enabled: bool
    method: Optional[str] = Field(None, pattern='^(email|authenticator)$')
    backup_codes: Optional[List[str]] = None


class SecuritySettings(BaseModel):
    """Schema for user security settings"""
    two_factor_auth: TwoFactorSetup
    login_alerts: bool = Field(default=True)
    session_timeout: int = Field(default=60, ge=5, le=1440)  # minutes


class APIKeyResponse(BaseModel):
    """Schema for API key response"""
    id: int
    name: str
    key_prefix: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


class CreateAPIKey(BaseModel):
    """Schema for creating API key"""
    name: str = Field(..., min_length=1, max_length=100)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class CreateAPIKeyResponse(BaseModel):
    """Schema for create API key response"""
    api_key: APIKeyResponse
    full_key: str  # Only shown once


class RateLimitInfo(BaseModel):
    """Schema for rate limit information"""
    limit: int
    remaining: int
    reset_time: datetime


class UsageStatistics(BaseModel):
    """Schema for usage statistics"""
    documents_uploaded: int
    searches_performed: int
    storage_used: int  # in bytes
    api_calls: int
    period_start: datetime
    period_end: datetime