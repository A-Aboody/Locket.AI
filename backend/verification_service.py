# backend/verification_service.py
"""
Verification code and token management
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import logging
from database_models import VerificationCode, PasswordResetToken
from db_config import get_db_context

logger = logging.getLogger(__name__)


class VerificationService:
    """Service for managing verification codes and tokens"""
    
    def __init__(self):
        self.verification_code_expiry = timedelta(minutes=15)  # 15 minutes for email verification
        self.reset_token_expiry = timedelta(hours=1)  # 1 hour for password reset
    
    def generate_verification_code(self, length: int = 6) -> str:
        """
        Generate a random numeric verification code
        
        Args:
            length: Code length (default: 6)
        
        Returns:
            Random numeric code
        """
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    def generate_reset_token(self, length: int = 32) -> str:
        """
        Generate a secure random token for password reset
        
        Args:
            length: Token length (default: 32)
        
        Returns:
            Random URL-safe token
        """
        return secrets.token_urlsafe(length)
    
    def create_verification_code(self, user_id: int, email: str) -> Optional[str]:
        """
        Create and store a verification code for email verification
        
        Args:
            user_id: User ID
            email: User email
        
        Returns:
            Verification code or None if failed
        """
        try:
            with get_db_context() as db:
                # Invalidate any existing codes for this user
                db.query(VerificationCode).filter(
                    VerificationCode.user_id == user_id,
                    VerificationCode.is_used == False
                ).update({"is_used": True})
                
                # Generate new code
                code = self.generate_verification_code()
                expires_at = datetime.now(timezone.utc) + self.verification_code_expiry
                
                verification_code = VerificationCode(
                    user_id=user_id,
                    email=email,
                    code=code,
                    expires_at=expires_at,
                    is_used=False
                )
                
                db.add(verification_code)
                db.commit()
                
                logger.info(f"Created verification code for user {user_id}")
                return code
                
        except Exception as e:
            logger.error(f"Failed to create verification code for user {user_id}: {str(e)}")
            return None
    
    def verify_code(self, user_id: int, code: str) -> bool:
        """
        Verify a verification code
        
        Args:
            user_id: User ID
            code: Verification code to check
        
        Returns:
            True if code is valid and not expired
        """
        try:
            with get_db_context() as db:
                verification = db.query(VerificationCode).filter(
                    VerificationCode.user_id == user_id,
                    VerificationCode.code == code,
                    VerificationCode.is_used == False,
                    VerificationCode.expires_at > datetime.now(timezone.utc)
                ).first()
                
                if verification:
                    # Mark code as used
                    verification.is_used = True
                    verification.used_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    logger.info(f"Verified code for user {user_id}")
                    return True
                
                logger.warning(f"Invalid or expired verification code for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying code for user {user_id}: {str(e)}")
            return False
    
    def create_password_reset_token(self, user_id: int) -> Optional[str]:
        """
        Create a password reset token
        
        Args:
            user_id: User ID
        
        Returns:
            Reset token or None if failed
        """
        try:
            with get_db_context() as db:
                # Invalidate any existing tokens for this user
                db.query(PasswordResetToken).filter(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.is_used == False
                ).update({"is_used": True})
                
                # Generate new token
                token = self.generate_reset_token()
                expires_at = datetime.now(timezone.utc) + self.reset_token_expiry
                
                reset_token = PasswordResetToken(
                    user_id=user_id,
                    token=token,
                    expires_at=expires_at,
                    is_used=False
                )
                
                db.add(reset_token)
                db.commit()
                
                logger.info(f"Created password reset token for user {user_id}")
                return token
                
        except Exception as e:
            logger.error(f"Failed to create reset token for user {user_id}: {str(e)}")
            return None
    
    def verify_reset_token(self, user_id: int, token: str) -> bool:
        """
        Verify a password reset token
        
        Args:
            user_id: User ID
            token: Reset token to verify
        
        Returns:
            True if token is valid and not expired
        """
        try:
            with get_db_context() as db:
                reset_token = db.query(PasswordResetToken).filter(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.token == token,
                    PasswordResetToken.is_used == False,
                    PasswordResetToken.expires_at > datetime.now(timezone.utc)
                ).first()
                
                if reset_token:
                    logger.info(f"Verified reset token for user {user_id}")
                    return True
                
                logger.warning(f"Invalid or expired reset token for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying reset token for user {user_id}: {str(e)}")
            return False
    
    def mark_reset_token_used(self, user_id: int, token: str) -> bool:
        """
        Mark a reset token as used
        
        Args:
            user_id: User ID
            token: Token to mark as used
        
        Returns:
            True if successful
        """
        try:
            with get_db_context() as db:
                reset_token = db.query(PasswordResetToken).filter(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.token == token
                ).first()
                
                if reset_token:
                    reset_token.is_used = True
                    reset_token.used_at = datetime.now(timezone.utc)
                    db.commit()
                    
                    logger.info(f"Marked reset token as used for user {user_id}")
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error marking reset token as used for user {user_id}: {str(e)}")
            return False
    
    def cleanup_expired_tokens(self) -> Dict[str, int]:
        """
        Clean up expired verification codes and reset tokens
        
        Returns:
            Dictionary with cleanup statistics
        """
        try:
            with get_db_context() as db:
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
                
                stats = {
                    "expired_codes_cleaned": expired_codes,
                    "expired_tokens_cleaned": expired_tokens
                }
                
                logger.info(f"Cleaned up {expired_codes} expired codes and {expired_tokens} expired tokens")
                return stats
                
        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {str(e)}")
            return {"expired_codes_cleaned": 0, "expired_tokens_cleaned": 0}


# Global verification service instance
verification_service = VerificationService()