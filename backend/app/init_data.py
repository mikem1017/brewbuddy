"""
Initialize database with default user and settings.
Run this script once after first installation.
"""
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, auth


def init_default_user(db: Session):
    """Create default admin user if no users exist."""
    existing_user = db.query(models.User).first()
    if existing_user:
        print("Users already exist, skipping default user creation")
        return
    
    default_user = models.User(
        username="admin",
        email="admin@brewbuddy.local",
        password_hash=auth.get_password_hash("admin"),
        role="admin"
    )
    db.add(default_user)
    db.commit()
    print("[OK] Default admin user created (username: admin, password: admin)")
    print("[WARNING] Please change the password immediately!")


def init_default_settings(db: Session):
    """Create default settings."""
    default_settings = {
        "units_temperature": "celsius",
        "units_volume": "liters",
        "theme": "dark",
        "graph_time_range": "auto",
        "live_plotting": "true",
        "show_tooltips": "true",
    }
    
    for key, value in default_settings.items():
        existing = db.query(models.Settings).filter(models.Settings.key == key).first()
        if not existing:
            setting = models.Settings(key=key, value=value)
            db.add(setting)
    
    db.commit()
    print("[OK] Default settings initialized")


def initialize_database():
    """Initialize the database with all tables and default data."""
    print("Initializing BrewBuddy database...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created")
    
    # Create session
    db = SessionLocal()
    try:
        init_default_user(db)
        init_default_settings(db)
        print("\n[SUCCESS] Database initialization complete!")
        print("\nYou can now start the server with: python -m uvicorn app.main:app --reload")
    finally:
        db.close()


if __name__ == "__main__":
    initialize_database()

