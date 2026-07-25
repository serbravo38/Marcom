from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Create engine
# Note: echo=True logs all SQL queries to console, useful for development.
engine = create_engine(settings.DATABASE_URL, echo=True)

# Create session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()

# DB dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
