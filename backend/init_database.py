"""
Database initialization script - Minimal Version
Only creates tables and initial admin user for first-time setup
"""

import sys
import bcrypt
from datetime import datetime, timezone
from sqlalchemy import inspect
from db_config import engine, get_db_context, test_connection
from database_models import Base, User, UserRole, Document


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_tables():
    """Create all database tables"""
    print("\n[INFO] Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Tables created successfully: users, documents")
        return True
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        return False


def check_tables_exist():
    """Check if database tables exist"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    return 'users' in existing_tables and 'documents' in existing_tables


def create_initial_admin(username: str, email: str, password: str, full_name: str = "Administrator"):
    """Create initial admin user for first login"""
    try:
        with get_db_context() as db:
            # Check if any admin exists
            existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
            if existing_admin:
                print(f"[ERROR] Admin user already exists: {existing_admin.username}")
                return None
            
            # Check if username/email taken
            existing_user = db.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            if existing_user:
                print(f"[ERROR] Username or email already exists")
                return None
            
            # Create admin
            admin = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            print(f"\n[SUCCESS] Initial admin user created!")
            print(f"   Username: {username}")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            
            return admin
            
    except Exception as e:
        print(f"[ERROR] Error creating admin: {e}")
        return None


def list_users():
    """List all users"""
    try:
        with get_db_context() as db:
            users = db.query(User).all()
            
            if not users:
                print("\n[INFO] No users in database")
                return
            
            print(f"\n[INFO] Total Users: {len(users)}")
            print("-" * 70)
            
            for user in users:
                role_label = "[ADMIN]" if user.role == UserRole.ADMIN else "[USER]"
                status = "ACTIVE" if user.is_active else "INACTIVE"
                print(f"{role_label} {user.username} ({user.email}) - {status}")
            
            print("-" * 70)
                
    except Exception as e:
        print(f"[ERROR] Error: {e}")


def show_stats():
    """Show database statistics"""
    try:
        with get_db_context() as db:
            total_users = db.query(User).count()
            admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
            user_count = db.query(User).filter(User.role == UserRole.USER).count()
            doc_count = db.query(Document).count()
            
            print("\n[INFO] Database Statistics")
            print("-" * 40)
            print(f"Users:     {total_users} total ({admin_count} admin, {user_count} standard)")
            print(f"Documents: {doc_count}")
            print("-" * 40)
            
    except Exception as e:
        print(f"[ERROR] Error: {e}")


def show_help():
    """Show available commands"""
    print("\n" + "="*60)
    print("  Database Initialization - Available Commands")
    print("="*60)
    print("\nSetup:")
    print("  python init_database.py              - Initialize database")
    print("  python init_database.py setup        - Initialize database")
    print("\nUtility:")
    print("  python init_database.py list         - List all users")
    print("  python init_database.py stats        - Show statistics")
    print("  python init_database.py test         - Test connection")
    print("\nInfo:")
    print("  python init_database.py help         - Show this message")
    print("="*60 + "\n")


def initialize_database():
    """Main initialization process"""
    print("\n" + "="*60)
    print("  Document Retrieval System - Database Setup")
    print("="*60)
    
    # Test connection
    print("\n[INFO] Testing database connection...")
    if not test_connection():
        print("\n[ERROR] Database connection failed!")
        print("   Check your .env file and PostgreSQL service")
        return False
    
    # Check if already initialized
    if check_tables_exist():
        print("\n[INFO] Database already initialized")
        show_stats()
        print("[INFO] Use 'python init_database.py list' to see all users")
        return True
    
    # Create tables
    print("\n[INFO] Creating database structure...")
    if not create_tables():
        return False
    
    # Create initial admin
    print("\n[INFO] Creating initial admin user...")
    print("   This user will have full access to manage the system")
    
    username = input("\nEnter admin username: ").strip()
    email = input("Enter admin email: ").strip()
    password = input("Enter admin password: ").strip()
    
    if not username or not email or not password:
        print("[ERROR] All fields are required!")
        return False
    
    if len(password) < 6:
        print("[ERROR] Password must be at least 6 characters")
        return False
    
    admin = create_initial_admin(username, email, password)
    
    if admin:
        print("\n" + "="*60)
        print("  [SUCCESS] Database Setup Complete!")
        return True
    
    return False


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command in ["setup", "init", "initialize"]:
            initialize_database()
        elif command == "list":
            list_users()
        elif command == "stats":
            show_stats()
        elif command == "test":
            test_connection()
        elif command == "help":
            show_help()
        else:
            print(f"[ERROR] Unknown command: {command}")
            show_help()
    else:
        # Default: run initialization
        initialize_database()


if __name__ == "__main__":
    main()