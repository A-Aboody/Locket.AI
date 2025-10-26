"""
Database configuration and session management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os
from contextlib import contextmanager
import time

# Load environment variables
load_dotenv()

print("[DB CONFIG] Initializing database configuration...")

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("[DB CONFIG ERROR] DATABASE_URL environment variable is not set!")
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Please create a .env file with DATABASE_URL=postgresql://user:pass@localhost:5432/dbname"
    )

print(f"[DB CONFIG] DATABASE_URL loaded")

# Auto-convert to psycopg v3 dialect if needed
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    original_url = DATABASE_URL
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    print(f"[DB CONFIG] Auto-converted DATABASE_URL to use psycopg (v3) dialect")

# Mask password for logging
masked_url = DATABASE_URL
if "@" in masked_url:
    parts = masked_url.split("@")
    credentials = parts[0].split("//")[1]
    if ":" in credentials:
        username = credentials.split(":")[0]
        masked_url = masked_url.replace(credentials, f"{username}:****")

print(f"[DB CONFIG] Connection string: {masked_url}")

# Create engine with appropriate settings
if "sqlite" in DATABASE_URL:
    print("[DB CONFIG] Using SQLite configuration")
    # SQLite configuration (for development/testing)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False  # Set to True for SQL query logging
    )
else:
    print("[DB CONFIG] Using PostgreSQL configuration")
    # PostgreSQL configuration (for production)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=10,  # Number of connections to maintain
        max_overflow=20,  # Maximum number of connections to create beyond pool_size
        echo=False  # Set to True for SQL query logging
    )
    print(f"[DB CONFIG] Connection pool: size=10, max_overflow=20, pre_ping=True")


# Add connection event listeners for debugging
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when a new connection is created"""
    print(f"[DB] New database connection established")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log when a connection is checked out from pool"""
    pass  # Too verbose, uncomment if needed
    # print(f"[DB] Connection checked out from pool")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log when a connection is returned to pool"""
    pass  # Too verbose, uncomment if needed
    # print(f"[DB] Connection returned to pool")


# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print("[DB CONFIG] Session factory created")


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
    except Exception as e:
        print(f"[DB ERROR] Session error: {e}")
        db.rollback()
        raise
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
    except Exception as e:
        print(f"[DB ERROR] Transaction error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def test_connection():
    """Test database connection"""
    print("\n" + "="*60)
    print("[DB TEST] Testing database connection...")
    print("="*60)
    
    try:
        start_time = time.time()
        with engine.connect() as connection:
            # Execute a simple query
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            
        elapsed_time = (time.time() - start_time) * 1000
        
        print(f"[DB TEST] Connection successful!")
        print(f"[DB TEST] Response time: {elapsed_time:.2f}ms")
        print(f"[DB TEST] Database dialect: {engine.dialect.name}")
        print(f"[DB TEST] Driver: {engine.driver}")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"[DB TEST ERROR] Connection failed!")
        print(f"[DB TEST ERROR] Error type: {type(e).__name__}")
        print(f"[DB TEST ERROR] Error message: {str(e)}")
        
        # Provide helpful troubleshooting tips
        print("\n[DB TEST] Troubleshooting tips:")
        print("  1. Check if PostgreSQL is running")
        print("  2. Verify DATABASE_URL in .env file")
        print("  3. Ensure database exists")
        print("  4. Check username/password are correct")
        print("  5. Verify host and port are accessible")
        print("="*60 + "\n")
        
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
                    url = url.replace(credentials, f"{username}:****")
            
            # Get pool info
            pool = engine.pool
            
            info = {
                "dialect": dialect,
                "driver": engine.driver,
                "url": url,
                "pool_size": pool.size(),
                "checked_out_connections": pool.checkedout(),
                "overflow": pool.overflow(),
                "connection_timeout": pool.timeout() if hasattr(pool, 'timeout') else 'N/A'
            }
            
            return info
            
    except Exception as e:
        return {"error": str(e)}


def display_db_info():
    """Display database information"""
    info = get_db_info()
    
    print("\n" + "="*60)
    print("  Database Information")
    print("="*60)
    
    if "error" in info:
        print(f"[ERROR] {info['error']}")
    else:
        print(f"Dialect:        {info['dialect']}")
        print(f"Driver:         {info['driver']}")
        print(f"URL:            {info['url']}")
        print(f"Pool Size:      {info['pool_size']}")
        print(f"Active Conns:   {info['checked_out_connections']}")
        print(f"Overflow:       {info['overflow']}")
        print(f"Timeout:        {info['connection_timeout']}")
    
    print("="*60 + "\n")


# Import text for SQL queries
from sqlalchemy import text

# Test connection on startup
print("[DB CONFIG] Testing connection on startup...")
if test_connection():
    print("[DB CONFIG] Database configuration complete\n")
else:
    print("[DB CONFIG WARNING] Database connection test failed!")
    print("[DB CONFIG WARNING] Application may not work correctly\n")