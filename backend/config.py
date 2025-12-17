#backend/config.py
"""
Application configuration
Loads environment-specific settings
"""

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    DEV_SECRET_KEY = os.getenv("DEV_SECRET_KEY")
    PROD_SECRET_KEY = os.getenv("PROD_SECRET_KEY")
    
    # Debug mode flag
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    print(f"[CONFIG] Loading configuration...")
    print(f"[CONFIG] Environment: {ENVIRONMENT}")
    print(f"[CONFIG] Debug mode: {DEBUG}")
    
    if ENVIRONMENT == "production":
        SECRET_KEY = PROD_SECRET_KEY
        if not SECRET_KEY:
            print(f"[CONFIG ERROR] PROD_SECRET_KEY must be set in production environment")
            raise ValueError("PROD_SECRET_KEY must be set in production environment")
        print(f"[CONFIG] Using PROD_SECRET_KEY")
    else:
        SECRET_KEY = DEV_SECRET_KEY
        if not SECRET_KEY:
            print(f"[CONFIG ERROR] DEV_SECRET_KEY must be set in development environment")
            raise ValueError("DEV_SECRET_KEY must be set in development environment")
        print(f"[CONFIG] Using DEV_SECRET_KEY")
    
    if not DATABASE_URL:
        print(f"[CONFIG ERROR] DATABASE_URL is not set!")
        raise ValueError("DATABASE_URL environment variable is not set")
    
    # Mask password in database URL for logging
    masked_db_url = DATABASE_URL
    if "@" in masked_db_url:
        parts = masked_db_url.split("@")
        credentials = parts[0].split("//")[1]
        if ":" in credentials:
            username = credentials.split(":")[0]
            masked_db_url = masked_db_url.replace(credentials, f"{username}:****")
    
    print(f"[CONFIG] Database URL: {masked_db_url}")
    
    APP_NAME = os.getenv("APP_NAME", "Document Retrieval System")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ALGORITHM = "HS256"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8001"))
    
    print(f"[CONFIG] App name: {APP_NAME}")
    print(f"[CONFIG] Token expiry: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    print(f"[CONFIG] Host: {HOST}:{PORT}")
    
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
    print(f"[CONFIG] CORS origins: {CORS_ORIGINS}")
    
    # Document Upload Settings
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
    ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.docx', '.doc'}
    
    print(f"[CONFIG] Max upload size: {MAX_UPLOAD_SIZE_MB} MB")
    print(f"[CONFIG] Upload directory: {UPLOAD_DIR}")
    print(f"[CONFIG] Allowed extensions: {ALLOWED_EXTENSIONS}")

    # Create upload directory if it doesn't exist
    @classmethod
    def ensure_upload_dir(cls):
        """Create upload directory if it doesn't exist"""
        if not os.path.exists(cls.UPLOAD_DIR):
            try:
                os.makedirs(cls.UPLOAD_DIR)
                print(f"[CONFIG] Created upload directory: {cls.UPLOAD_DIR}")
            except Exception as e:
                print(f"[CONFIG ERROR] Failed to create upload directory: {e}")
                raise
        else:
            print(f"[CONFIG] Upload directory exists: {cls.UPLOAD_DIR}")
    
    @classmethod
    def display_info(cls):
        print("\n" + "="*60)
        print("  Configuration Information")
        print("="*60)
        print(f"Environment:       {cls.ENVIRONMENT}")
        print(f"Debug Mode:        {cls.DEBUG}")
        
        # Mask database URL for display
        masked_url = cls.DATABASE_URL
        if '@' in masked_url:
            parts = masked_url.split('@')
            credentials = parts[0].split('//')[1]
            if ':' in credentials:
                username = credentials.split(':')[0]
                masked_url = masked_url.replace(credentials, f"{username}:****")
        
        print(f"Database:          {masked_url}")
        print(f"Secret Key Set:    {'Yes' if cls.SECRET_KEY else 'No'}")
        print(f"Using Key:         {'PROD_SECRET_KEY' if cls.ENVIRONMENT == 'production' else 'DEV_SECRET_KEY'}")
        print(f"Upload Directory:  {cls.UPLOAD_DIR}")
        print(f"Max Upload Size:   {cls.MAX_UPLOAD_SIZE_MB} MB")
        print(f"Allowed Types:     {', '.join(cls.ALLOWED_EXTENSIONS)}")
        print(f"CORS Origins:      {', '.join(cls.CORS_ORIGINS)}")
        print("="*60 + "\n")

config = Config()
SECRET_KEY = config.SECRET_KEY
DATABASE_URL = config.DATABASE_URL
ENVIRONMENT = config.ENVIRONMENT

# Ensure upload directory exists on startup
try:
    config.ensure_upload_dir()
    print("[CONFIG] Upload directory check complete")
except Exception as e:
    print(f"[CONFIG ERROR] Failed to create upload directory: {e}")
    raise

print("[CONFIG] Configuration loaded successfully\n")