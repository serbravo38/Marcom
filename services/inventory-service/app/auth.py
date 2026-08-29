import jwt
from jwt.exceptions import PyJWTError as JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/iniciar-sesion", auto_error=False)

def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token de autenticación",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        usuario_id: str = payload.get("usuario_id")
        role: str = payload.get("role")
        email: str = payload.get("email")
        if usuario_id is None:
            raise credentials_exception
        return {"usuario_id": usuario_id, "role": role, "email": email}
    except JWTError:
        raise credentials_exception

def require_role(roles: list[str]):
    def dependency(token_data: dict = Depends(verify_token)):
        if token_data.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción"
            )
        return token_data
    return dependency
