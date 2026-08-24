from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth, models

router = APIRouter()

# --- AUTH ENDPOINTS ---

@router.post("/auth/registrar", response_model=schemas.UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: schemas.UsuarioCrear, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if email exists
    db_user = crud.obtener_usuario_por_correo(db, correo=user_in.correo)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    # Check if RUT exists
    db_user_rut = crud.obtener_usuario_por_rut(db, rut=user_in.rut)
    if db_user_rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado."
        )
    return crud.crear_usuario(db=db, usuario_in=user_in)

@router.post("/auth/iniciar-sesion", response_model=schemas.Token)
def login_user(user_login: schemas.IniciarSesionUsuario, db: Session = Depends(get_db)):
    user = crud.obtener_usuario_por_correo(db, correo=user_login.correo)
    if not user or not crud.verificar_clave(user_login.clave, user.clave_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo. Contacta al administrador."
        )
    
    # Generate token
    token_data = {
        "usuario_id": str(user.usuario_id),
        "email": user.correo,
        "role": user.rol.value
    }
    access_token = auth.create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


# --- USER ENDPOINTS ---

@router.get("/usuarios/me", response_model=schemas.UsuarioRespuesta)
def get_me(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

@router.get("/usuarios", response_model=List[schemas.UsuarioRespuesta])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    return crud.obtener_usuarios(db, skip=skip, limit=limit)

@router.post("/usuarios", response_model=schemas.UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UsuarioCrear, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if email exists
    db_user = crud.obtener_usuario_por_correo(db, correo=user_in.correo)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    # Check if RUT exists
    db_user_rut = crud.obtener_usuario_por_rut(db, rut=user_in.rut)
    if db_user_rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado."
        )
    return crud.crear_usuario(db=db, usuario_in=user_in)

@router.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def get_user_by_id(
    usuario_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return user

@router.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def update_user(
    usuario_id: UUID,
    user_update: schemas.UsuarioActualizar,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if user exists
    db_user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    # If updating email, check if it already exists
    if user_update.correo and user_update.correo != db_user.correo:
        other_user = crud.obtener_usuario_por_correo(db, correo=user_update.correo)
        if other_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está registrado por otro usuario."
            )
            
    # If updating RUT, check if it already exists
    if user_update.rut and user_update.rut != db_user.rut:
        other_user_rut = crud.obtener_usuario_por_rut(db, rut=user_update.rut)
        if other_user_rut:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El RUT ya está registrado por otro usuario."
            )
    
    return crud.actualizar_usuario(db=db, db_usuario=db_user, usuario_update=user_update)

@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    usuario_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Prevent admin from deleting themselves
    if current_user.usuario_id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta de administrador."
        )
        
    db_user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    from sqlalchemy.exc import IntegrityError
    try:
        db.delete(db_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el usuario porque tiene registros asociados (movimientos, órdenes, etc.). Te recomendamos desactivarlo."
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/usuarios/{usuario_id}/perfil", response_model=schemas.PerfilClienteRespuesta)
def update_user_profile(
    usuario_id: UUID,
    profile_in: schemas.PerfilClienteCrear,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Security check: users can only edit their own profile, unless they are admin
    if current_user.rol != models.RolUsuario.ADMIN and current_user.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el perfil de otro usuario."
        )
    
    # Check if user exists
    user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        
    # Check if agreement exists (if provided)
    if profile_in.convenio_id:
        agreement = crud.obtener_convenio_por_id(db, convenio_id=profile_in.convenio_id)
        if not agreement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
            
    return crud.crear_o_actualizar_perfil(db=db, usuario_id=usuario_id, perfil_in=profile_in)


# --- AGREEMENTS ENDPOINTS ---

@router.post("/convenios", response_model=schemas.ConvenioRespuesta, status_code=status.HTTP_201_CREATED)
def create_new_agreement(
    agreement_in: schemas.ConvenioCrear,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN, models.RolUsuario.JEFE_BODEGA]))
):
    db_agreement = crud.obtener_convenio_por_rut(db, rut=agreement_in.rut)
    if db_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un convenio registrado con este RUT."
        )
    return crud.crear_convenio(db=db, convenio_in=agreement_in)

@router.get("/convenios", response_model=List[schemas.ConvenioRespuesta])
def list_agreements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Any authenticated user can list agreements (e.g. technicians or clients looking up references)
    return crud.obtener_convenios(db, skip=skip, limit=limit)
