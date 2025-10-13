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
    
    if ENVIRONMENT == "production":
        SECRET_KEY = PROD_SECRET_KEY
        if not SECRET_KEY:
            raise ValueError("PROD_SECRET_KEY must be set in production environment")
    else:
        SECRET_KEY = DEV_SECRET_KEY
        if not SECRET_KEY:
            raise ValueError("DEV_SECRET_KEY must be set in development environment")
    
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    APP_NAME = os.getenv("APP_NAME", "Document Retrieval System")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ALGORITHM = "HS256"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
    ALLOWED_EXTENSIONS = set(os.getenv("ALLOWED_EXTENSIONS", "pdf,doc,docx,xls,xlsx,txt").split(","))
    
    @classmethod
    def display_info(cls):
        print("\n" + "="*60)
        print("  Configuration Information")
        print("="*60)
        print(f"Environment:       {cls.ENVIRONMENT}")
        print(f"Debug Mode:        {cls.DEBUG}")
        print(f"Database:          {cls.DATABASE_URL.split('@')[1] if '@' in cls.DATABASE_URL else 'Not configured'}")
        print(f"Secret Key Set:    {'Yes' if cls.SECRET_KEY else 'No'}")
        print(f"Using Key:         {'DEV_SECRET_KEY' if cls.ENVIRONMENT != 'production' else 'PROD_SECRET_KEY'}")
        print("="*60 + "\n")

config = Config()
SECRET_KEY = config.SECRET_KEY
DATABASE_URL = config.DATABASE_URL
ENVIRONMENT = config.ENVIRONMENT