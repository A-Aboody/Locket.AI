"""
Database initialization script - Enhanced Version
Creates all tables including authentication system tables
"""

import sys
import bcrypt
from datetime import datetime, timezone
from sqlalchemy import inspect
from db_config import engine, get_db_context, test_connection
from database_models import Base, User, UserRole, UserStatus, Document, VerificationCode, PasswordResetToken, UserGroup, UserGroupMember, Chat, ChatMessage, ChatCitation


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_tables():
    """Create all database tables including auth system tables"""
    print("\n[INFO] Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] All tables created successfully!")
        print("  - users")
        print("  - documents")
        print("  - verification_codes")
        print("  - password_reset_tokens")
        print("  - user_groups")
        print("  - user_group_members")
        print("  - chats")
        print("  - chat_messages")
        print("  - chat_citations")
        return True
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        return False


def check_tables_exist():
    """Check if all required database tables exist"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    required_tables = [
        'users', 'documents', 'verification_codes',
        'password_reset_tokens', 'user_groups', 'user_group_members',
        'chats', 'chat_messages', 'chat_citations'
    ]
    
    missing_tables = [table for table in required_tables if table not in existing_tables]
    
    if missing_tables:
        print(f"[INFO] Missing tables: {missing_tables}")
        return False
    
    print("[INFO] All required tables exist")
    return True


def create_initial_admin(username: str, email: str, password: str, full_name: str = "Administrator"):
    """Create initial admin user for first login with enhanced auth fields"""
    try:
        with get_db_context() as db:
            # Check if any admin exists
            existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
            if existing_admin:
                print(f"[INFO] Admin user already exists: {existing_admin.username}")
                return existing_admin
            
            # Check if username/email taken
            existing_user = db.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            if existing_user:
                print(f"[ERROR] Username or email already exists")
                return None
            
            # Create admin with enhanced auth fields
            admin = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_active=True,
                email_verified=True,  # Admin email is auto-verified
                created_at=datetime.now(timezone.utc),
                last_password_change=datetime.now(timezone.utc)
            )
            
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            print(f"\n[SUCCESS] Initial admin user created!")
            print(f"   Username: {username}")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"   Role: {admin.role.value}")
            print(f"   Status: {admin.status.value}")
            
            return admin
            
    except Exception as e:
        print(f"[ERROR] Error creating admin: {e}")
        return None


def list_users():
    """List all users with enhanced auth information"""
    try:
        with get_db_context() as db:
            users = db.query(User).all()
            
            if not users:
                print("\n[INFO] No users in database")
                return
            
            print(f"\n[INFO] Total Users: {len(users)}")
            print("-" * 90)
            
            for user in users:
                role_label = "[ADMIN]" if user.role == UserRole.ADMIN else "[USER]"
                status_icon = "✓" if user.is_active else "✗"
                verified_icon = "✓" if user.email_verified else "✗"
                print(f"{role_label} {user.username:15} {user.email:25} {status_icon} Active  {verified_icon} Verified  {user.status.value:10}")
            
            print("-" * 90)
                
    except Exception as e:
        print(f"[ERROR] Error: {e}")


def show_stats():
    """Show comprehensive database statistics"""
    try:
        with get_db_context() as db:
            # User statistics
            total_users = db.query(User).count()
            admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
            user_count = db.query(User).filter(User.role == UserRole.USER).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            verified_users = db.query(User).filter(User.email_verified == True).count()
            
            # Document statistics
            doc_count = db.query(Document).count()
            
            # Auth system statistics
            verification_codes = db.query(VerificationCode).count()
            reset_tokens = db.query(PasswordResetToken).count()
            used_codes = db.query(VerificationCode).filter(VerificationCode.is_used == True).count()
            used_tokens = db.query(PasswordResetToken).filter(PasswordResetToken.is_used == True).count()
            
            # Group statistics
            group_count = db.query(UserGroup).count()
            group_members = db.query(UserGroupMember).count()

            # Chat statistics
            chat_count = db.query(Chat).count()
            message_count = db.query(ChatMessage).count()
            citation_count = db.query(ChatCitation).count()

            print("\n[INFO] Database Statistics")
            print("=" * 50)
            print(f"Users:           {total_users} total")
            print(f"  - Admins:      {admin_count}")
            print(f"  - Standard:    {user_count}")
            print(f"  - Active:      {active_users}")
            print(f"  - Verified:    {verified_users}")
            print(f"Documents:       {doc_count}")
            print(f"User Groups:     {group_count}")
            print(f"Group Members:   {group_members}")
            print(f"Chats:           {chat_count}")
            print(f"  - Messages:    {message_count}")
            print(f"  - Citations:   {citation_count}")
            print(f"Auth System:")
            print(f"  - Verification codes: {verification_codes} ({used_codes} used)")
            print(f"  - Reset tokens:       {reset_tokens} ({used_tokens} used)")
            print("=" * 50)
            
    except Exception as e:
        print(f"[ERROR] Error: {e}")


def cleanup_expired_tokens():
    """Clean up expired verification codes and reset tokens"""
    try:
        with get_db_context() as db:
            from datetime import datetime, timezone
            
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
            
            print(f"\n[SUCCESS] Cleaned up expired tokens:")
            print(f"  - Expired verification codes: {expired_codes}")
            print(f"  - Expired reset tokens: {expired_tokens}")
            
            return expired_codes + expired_tokens
            
    except Exception as e:
        print(f"[ERROR] Error cleaning up tokens: {e}")
        return 0


def reset_database():
    """Drop and recreate all tables (DANGEROUS - for development only)"""
    print("\n[WARNING] This will DELETE ALL DATA and recreate the database!")
    confirmation = input("Type 'YES' to confirm: ")
    
    if confirmation != 'YES':
        print("[INFO] Operation cancelled")
        return False
    
    try:
        print("\n[INFO] Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("[INFO] Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        print("[SUCCESS] Database reset complete!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error resetting database: {e}")
        return False


def show_help():
    """Show available commands"""
    print("\n" + "="*60)
    print("  Database Management - Available Commands")
    print("="*60)
    print("\nSetup:")
    print("  python init_database.py              - Initialize database")
    print("  python init_database.py setup        - Initialize database")
    print("\nManagement:")
    print("  python init_database.py list         - List all users")
    print("  python init_database.py stats        - Show statistics")
    print("  python init_database.py cleanup      - Clean expired tokens")
    print("  python init_database.py reset        - RESET DATABASE (DANGEROUS)")
    print("\nUtility:")
    print("  python init_database.py test         - Test connection")
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
        print("\n[INFO] Available commands:")
        print("  python init_database.py list    - List all users")
        print("  python init_database.py stats   - Show statistics")
        print("  python init_database.py cleanup - Clean expired tokens")
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
        print("="*60)
        show_stats()
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
        elif command == "cleanup":
            cleanup_expired_tokens()
        elif command == "reset":
            reset_database()
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