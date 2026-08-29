from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt.exceptions import PyJWTError as JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.db import get_db
from app import crud, models, schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/iniciar-sesion", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Cast usuario_id to string if it's a UUID object
    if "usuario_id" in to_encode:
        to_encode["usuario_id"] = str(to_encode["usuario_id"])
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        usuario_id: str = payload.get("usuario_id")
        if usuario_id is None:
            raise credentials_exception
        token_data = schemas.DatosToken(usuario_id=usuario_id)
    except JWTError:
        raise credentials_exception
        
    user = crud.obtener_usuario_por_id(db, usuario_id=token_data.usuario_id)
    if user is None:
        raise credentials_exception
    return user

def require_role(roles: list[models.RolUsuario]):
    def dependency(current_user: models.Usuario = Depends(get_current_user)):
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción"
            )
        return current_user
    return dependency
