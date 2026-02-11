# backend/email_service.py
"""
Email service for sending verification codes and notifications
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending authentication emails"""

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SMTP_EMAIL")
        self.sender_password = os.getenv("SMTP_PASSWORD")
        self.app_name = os.getenv("APP_NAME", "Locket.AI")

        # Template directory
        self.template_dir = Path(__file__).parent / "email_templates"

        # Validate configuration
        if not all([self.sender_email, self.sender_password]):
            logger.warning("SMTP credentials not configured. Email functionality will be disabled.")
            self.enabled = False
        else:
            self.enabled = True

    def _load_template(self, template_name: str, variables: Dict[str, str]) -> str:
        """
        Load and render an email template

        Args:
            template_name: Name of the template file (without extension)
            variables: Dictionary of variables to substitute in the template

        Returns:
            Rendered template content
        """
        template_path = self.template_dir / template_name

        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()

            # Simple template variable substitution
            for key, value in variables.items():
                template_content = template_content.replace(f"{{{{{key}}}}}", str(value))

            return template_content
        except Exception as e:
            logger.error(f"Failed to load template {template_name}: {str(e)}")
            raise
    
    def send_verification_code(self, recipient_email: str, verification_code: str) -> bool:
        """
        Send email verification code

        Args:
            recipient_email: User's email address
            verification_code: 6-digit verification code

        Returns:
            True if email sent successfully
        """
        if not self.enabled:
            logger.warning("Email service disabled - cannot send verification code")
            return False

        subject = f"Verify Your Email - {self.app_name}"

        # Load templates with variables
        variables = {
            'app_name': self.app_name,
            'verification_code': verification_code
        }

        html_content = self._load_template('verification.html', variables)
        text_content = self._load_template('verification.txt', variables)

        return self._send_email(recipient_email, subject, text_content, html_content)
    
    def send_password_reset(self, recipient_email: str, reset_token: str, user_id: int) -> bool:
        """
        Send password reset email

        Args:
            recipient_email: User's email address
            reset_token: Password reset token
            user_id: User ID for the reset link

        Returns:
            True if email sent successfully
        """
        if not self.enabled:
            logger.warning("Email service disabled - cannot send password reset")
            return False

        # In a real application, you'd generate a proper reset link
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}&user={user_id}"

        subject = f"Password Reset Request - {self.app_name}"

        # Load templates with variables
        variables = {
            'app_name': self.app_name,
            'reset_link': reset_link
        }

        html_content = self._load_template('password_reset.html', variables)
        text_content = self._load_template('password_reset.txt', variables)

        return self._send_email(recipient_email, subject, text_content, html_content)

    def send_organization_invite(
        self,
        recipient_email: str,
        organization_name: str,
        inviter_name: str,
        invite_code: str,
        expiry_date: str
    ) -> bool:
        """
        Send organization invitation email

        Args:
            recipient_email: Email address of the person being invited
            organization_name: Name of the organization
            inviter_name: Name of the person sending the invite
            invite_code: Unique invitation code
            expiry_date: Human-readable expiry date (e.g., "January 15, 2025")

        Returns:
            True if email sent successfully
        """
        if not self.enabled:
            logger.warning("Email service disabled - cannot send organization invite")
            return False

        # Import config here to avoid circular import
        from config import Config

        # Generate magic link
        magic_link = f"{Config.LANDING_PAGE_URL}/accept-invite?code={invite_code}"

        subject = f"Join {organization_name} on {self.app_name}"

        # Load templates with variables
        variables = {
            'app_name': self.app_name,
            'organization_name': organization_name,
            'inviter_name': inviter_name,
            'invite_code': invite_code,
            'magic_link': magic_link,
            'expiry_date': expiry_date
        }

        html_content = self._load_template('organization_invite.html', variables)
        text_content = self._load_template('organization_invite.txt', variables)

        return self._send_email(recipient_email, subject, text_content, html_content)

    def _send_email(self, recipient: str, subject: str, text_content: str, html_content: str) -> bool:
        """
        Send email using SMTP
        
        Args:
            recipient: Recipient email address
            subject: Email subject
            text_content: Plain text content
            html_content: HTML content
        
        Returns:
            True if email sent successfully
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender_email
            msg["To"] = recipient
            
            # Attach both plain text and HTML versions
            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {recipient}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()