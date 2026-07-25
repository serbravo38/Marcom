from sqlalchemy.orm import Session
from app import models, schemas
from passlib.context import CryptContext
from uuid import UUID

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# --- USER CRUD ---
def get_user_by_id(db: Session, user_id: UUID):
    return db.query(models.User).filter(models.User.user_id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_rut(db: Session, rut: str):
    return db.query(models.User).filter(models.User.rut == rut).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user_in: schemas.UserCreate):
    password_hash = get_password_hash(user_in.password)
    db_user = models.User(
        rut=user_in.rut,
        email=user_in.email,
        password_hash=password_hash,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_update: schemas.UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        password_hash = get_password_hash(update_data["password"])
        db_user.password_hash = password_hash
        del update_data["password"]
    
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

# --- AGREEMENT CRUD ---
def get_agreement_by_id(db: Session, agreement_id: UUID):
    return db.query(models.Agreement).filter(models.Agreement.agreement_id == agreement_id).first()

def get_agreement_by_rut(db: Session, rut: str):
    return db.query(models.Agreement).filter(models.Agreement.rut == rut).first()

def get_agreements(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Agreement).offset(skip).limit(limit).all()

def create_agreement(db: Session, agreement_in: schemas.AgreementCreate):
    db_agreement = models.Agreement(
        company_name=agreement_in.company_name,
        rut=agreement_in.rut,
        credit_limit=agreement_in.credit_limit,
        used_credit=agreement_in.used_credit,
        is_active=agreement_in.is_active
    )
    db.add(db_agreement)
    db.commit()
    db.refresh(db_agreement)
    return db_agreement

def update_agreement(db: Session, db_agreement: models.Agreement, agreement_update: schemas.AgreementUpdate):
    update_data = agreement_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_agreement, key, value)
        
    db.commit()
    db.refresh(db_agreement)
    return db_agreement

# --- PROFILE CRUD ---
def get_profile_by_user_id(db: Session, user_id: UUID):
    return db.query(models.CustomerProfile).filter(models.CustomerProfile.user_id == user_id).first()

def create_or_update_profile(db: Session, user_id: UUID, profile_in: schemas.CustomerProfileCreate):
    db_profile = get_profile_by_user_id(db, user_id)
    if db_profile:
        # Update
        update_data = profile_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_profile, key, value)
    else:
        # Create
        db_profile = models.CustomerProfile(
            user_id=user_id,
            agreement_id=profile_in.agreement_id,
            phone=profile_in.phone,
            address=profile_in.address,
            region=profile_in.region,
            commune=profile_in.commune
        )
        db.add(db_profile)
        
    db.commit()
    db.refresh(db_profile)
    return db_profile
