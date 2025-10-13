"""
Database configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os
from contextlib import contextmanager

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Please create a .env file with DATABASE_URL=postgresql://user:pass@localhost:5432/dbname"
    )

# Create engine with appropriate settings
if "sqlite" in DATABASE_URL:
    # SQLite configuration (for development/testing)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False  # Set to True for SQL query logging
    )
else:
    # PostgreSQL configuration (for production)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=10,  # Number of connections to maintain
        max_overflow=20,  # Maximum number of connections to create beyond pool_size
        echo=False  # Set to True for SQL query logging
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency function to get database session
    
    Usage in FastAPI:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database session
    
    Usage:
        with get_db_context() as db:
            user = db.query(User).first()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as connection:
            print("[SUCCESS] Database connection successful!")
            return True
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return False


def get_db_info():
    """Get database information"""
    try:
        with engine.connect() as connection:
            # Get database dialect
            dialect = engine.dialect.name
            
            # Get database URL (hide password)
            url = str(engine.url)
            if "@" in url:
                parts = url.split("@")
                credentials = parts[0].split("//")[1]
                if ":" in credentials:
                    username = credentials.split(":")[0]
                    url = url.replace(credentials, f"{username}:***")
            
            return {
                "dialect": dialect,
                "url": url,
                "pool_size": engine.pool.size(),
                "checked_out_connections": engine.pool.checkedout()
            }
    except Exception as e:
        return {"error": str(e)}