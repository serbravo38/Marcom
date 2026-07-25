from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth, models

router = APIRouter()

# --- AUTH ENDPOINTS ---

@router.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    db_user = crud.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    # Check if RUT exists
    db_user_rut = crud.get_user_by_rut(db, rut=user_in.rut)
    if db_user_rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado."
        )
    return crud.create_user(db=db, user_in=user_in)

@router.post("/auth/login", response_model=schemas.Token)
def login_user(user_login: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=user_login.email)
    if not user or not crud.verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo. Contacta al administrador."
        )
    
    # Generate token
    token_data = {
        "user_id": str(user.user_id),
        "email": user.email,
        "role": user.role.value
    }
    access_token = auth.create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


# --- USER ENDPOINTS ---

@router.get("/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.ADMIN]))
):
    return crud.get_users(db, skip=skip, limit=limit)

@router.post("/users/{user_id}/profile", response_model=schemas.CustomerProfileResponse)
def update_user_profile(
    user_id: UUID,
    profile_in: schemas.CustomerProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Security check: users can only edit their own profile, unless they are admin
    if current_user.role != models.RoleEnum.ADMIN and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el perfil de otro usuario."
        )
    
    # Check if user exists
    user = crud.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        
    # Check if agreement exists (if provided)
    if profile_in.agreement_id:
        agreement = crud.get_agreement_by_id(db, agreement_id=profile_in.agreement_id)
        if not agreement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
            
    return crud.create_or_update_profile(db=db, user_id=user_id, profile_in=profile_in)


# --- AGREEMENTS ENDPOINTS ---

@router.post("/agreements", response_model=schemas.AgreementResponse, status_code=status.HTTP_201_CREATED)
def create_new_agreement(
    agreement_in: schemas.AgreementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.ADMIN, models.RoleEnum.JEFE_BODEGA]))
):
    db_agreement = crud.get_agreement_by_rut(db, rut=agreement_in.rut)
    if db_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un convenio registrado con este RUT."
        )
    return crud.create_agreement(db=db, agreement_in=agreement_in)

@router.get("/agreements", response_model=List[schemas.AgreementResponse])
def list_agreements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Any authenticated user can list agreements (e.g. technicians or clients looking up references)
    return crud.get_agreements(db, skip=skip, limit=limit)
