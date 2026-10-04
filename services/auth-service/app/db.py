from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Create engine
# Note: echo=True logs all SQL queries to console, useful for development.
engine = create_engine(db_url, echo=True)

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
