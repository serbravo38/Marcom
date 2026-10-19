from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
import jwt
from jwt.exceptions import PyJWTError as JWTError
import base64
import hashlib
import io
import json
import secrets
import pyotp
import qrcode
from cryptography.fernet import Fernet
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
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta se encuentra inactiva o deshabilitada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
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

# Almacén en memoria con expiración para contraseñas temporales de recuperación (single-use, 30 min)
# Estructura: { correo_lower: {"usuario_id": str, "correo": str, "clave_hash": str, "expira_en": datetime} }
_TEMP_PASSWORDS_BY_EMAIL: dict[str, dict] = {}
# Índice rápido por hash SHA-256 de la clave temporal para permitir validación directa con o sin correo
_TEMP_PASSWORDS_BY_HASH: dict[str, dict] = {}

def _hash_temp_password(clave_temporal: str) -> str:
    return hashlib.sha256(clave_temporal.strip().encode("utf-8")).hexdigest()

def generate_temporary_password() -> str:
    """
    Genera una contraseña temporal segura (10 caracteres), legible y que cumple
    con la política alfanumérica + carácter especial (ej: Mc#4829Kp!).
    """
    upper_chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    lower_chars = "abcdefghijkmnopqrstuvwxyz"
    digits = "23456789"
    specials = "#!@$%&*"

    # Formato estructurado legible pero criptográficamente aleatorio: 2 letras + 1 especial + 4 dígitos + 2 letras + 1 especial
    part1 = secrets.choice(upper_chars) + secrets.choice(lower_chars)
    spec1 = secrets.choice(specials)
    nums = "".join(secrets.choice(digits) for _ in range(4))
    part2 = secrets.choice(upper_chars) + secrets.choice(lower_chars)
    spec2 = secrets.choice(specials)
    return f"{part1}{spec1}{nums}{part2}{spec2}"

def register_temporary_password(usuario_id: str, correo: str, clave_temporal: str, expires_minutes: int = 30) -> None:
    ahora = datetime.now(timezone.utc)
    expira_en = ahora + timedelta(minutes=expires_minutes)
    correo_norm = correo.strip().lower()
    temp_hash = _hash_temp_password(clave_temporal)

    # Limpiar clave temporal previa si existía para este correo
    prev = _TEMP_PASSWORDS_BY_EMAIL.get(correo_norm)
    if prev and prev.get("clave_hash") in _TEMP_PASSWORDS_BY_HASH:
        _TEMP_PASSWORDS_BY_HASH.pop(prev["clave_hash"], None)

    record = {
        "usuario_id": str(usuario_id),
        "correo": correo_norm,
        "clave_hash": temp_hash,
        "expira_en": expira_en
    }
    _TEMP_PASSWORDS_BY_EMAIL[correo_norm] = record
    _TEMP_PASSWORDS_BY_HASH[temp_hash] = record

def check_temporary_password_for_user(correo: str, candidate_password: str) -> bool:
    """
    Verifica si candidate_password corresponde a una contraseña temporal activa (no expirada)
    para el correo indicado, sin consumirla todavía (permite redirigir al cambio obligatorio).
    """
    if not correo or not candidate_password:
        return False
    correo_norm = correo.strip().lower()
    record = _TEMP_PASSWORDS_BY_EMAIL.get(correo_norm)
    if not record:
        return False
    ahora = datetime.now(timezone.utc)
    if record["expira_en"] < ahora:
        _TEMP_PASSWORDS_BY_EMAIL.pop(correo_norm, None)
        _TEMP_PASSWORDS_BY_HASH.pop(record["clave_hash"], None)
        return False
    return secrets.compare_digest(record["clave_hash"], _hash_temp_password(candidate_password))

def consume_temporary_password_for_user(correo: str) -> None:
    if not correo:
        return
    correo_norm = correo.strip().lower()
    record = _TEMP_PASSWORDS_BY_EMAIL.pop(correo_norm, None)
    if record:
        _TEMP_PASSWORDS_BY_HASH.pop(record.get("clave_hash", ""), None)

def verify_temporary_password_or_token(token_or_temp_pass: str, correo: Optional[str] = None) -> dict:
    """
    Verifica una contraseña temporal enviada por correo (o un token JWT de recuperación),
    la consume (uso único) y retorna {"usuario_id": ..., "correo": ...}.
    """
    cleaned = (token_or_temp_pass or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes ingresar la contraseña temporal o código de recuperación."
        )

    ahora = datetime.now(timezone.utc)
    candidate_hash = _hash_temp_password(cleaned)

    # 1. Buscar primero por correo si fue proporcionado
    if correo:
        correo_norm = correo.strip().lower()
        record = _TEMP_PASSWORDS_BY_EMAIL.get(correo_norm)
        if record:
            if record["expira_en"] < ahora:
                _TEMP_PASSWORDS_BY_EMAIL.pop(correo_norm, None)
                _TEMP_PASSWORDS_BY_HASH.pop(record["clave_hash"], None)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La contraseña temporal ha expirado (validez 30 minutos). Por favor solicita una nueva."
                )
            if secrets.compare_digest(record["clave_hash"], candidate_hash):
                _TEMP_PASSWORDS_BY_EMAIL.pop(correo_norm, None)
                _TEMP_PASSWORDS_BY_HASH.pop(record["clave_hash"], None)
                return {
                    "usuario_id": record["usuario_id"],
                    "correo": record["correo"],
                    "type": "password_reset"
                }

    # 2. Buscar directamente por el hash de la contraseña temporal
    record_by_hash = _TEMP_PASSWORDS_BY_HASH.get(candidate_hash)
    if record_by_hash:
        if record_by_hash["expira_en"] < ahora:
            _TEMP_PASSWORDS_BY_HASH.pop(candidate_hash, None)
            _TEMP_PASSWORDS_BY_EMAIL.pop(record_by_hash["correo"], None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña temporal ha expirado (validez 30 minutos). Por favor solicita una nueva."
            )
        _TEMP_PASSWORDS_BY_HASH.pop(candidate_hash, None)
        _TEMP_PASSWORDS_BY_EMAIL.pop(record_by_hash["correo"], None)
        return {
            "usuario_id": record_by_hash["usuario_id"],
            "correo": record_by_hash["correo"],
            "type": "password_reset"
        }

    # 3. Fallback compatible con tokens JWT firmados
    return verify_password_reset_token(cleaned)

def create_password_reset_token(usuario_id: str, correo: str, expires_minutes: int = 30) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode = {
        "usuario_id": str(usuario_id),
        "correo": correo,
        "type": "password_reset",
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_password_reset_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña temporal o código proporcionado no es válido."
            )
        usuario_id = payload.get("usuario_id")
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña temporal o código inválido."
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña temporal ha expirado. Por favor solicita una nueva."
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña temporal ingresada es incorrecta o ha expirado."
        )

# --- MFA / 2FA HELPERS ---

def _get_fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest())
    return Fernet(key)

def encrypt_mfa_secret(plain_secret: str) -> str:
    f = _get_fernet()
    return f.encrypt(plain_secret.encode()).decode()

def decrypt_mfa_secret(encrypted_secret: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted_secret.encode()).decode()

def generate_mfa_secret() -> str:
    return pyotp.random_base32()

def generate_totp_uri(secret: str, email: str, issuer_name: str = "MARCOM") -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer_name)

def generate_qr_base64(uri: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{qr_b64}"

def verify_totp_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    # valid_window=2 allows +-60 seconds to mitigate clock drift on mobile phones
    return totp.verify(code.strip(), valid_window=2)

def hash_backup_code(code: str) -> str:
    normalized = code.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()

def generate_backup_codes(count: int = 8) -> Tuple[List[str], str]:
    """
    Generates plain-text backup codes for user display and a JSON-serialized
    list of SHA-256 hashes to store in the database.
    """
    plain_codes = []
    hashed_codes = []
    for _ in range(count):
        code = f"{secrets.token_hex(2)}-{secrets.token_hex(2)}"
        plain_codes.append(code)
        hashed_codes.append(hash_backup_code(code))
    return plain_codes, json.dumps(hashed_codes)

def verify_and_consume_backup_code(stored_json: Optional[str], code: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if `code` matches any hashed backup code.
    If match is found, returns (True, new_json_with_code_removed).
    Otherwise returns (False, None).
    """
    if not stored_json:
        return False, None
    try:
        hashes: List[str] = json.loads(stored_json)
    except Exception:
        return False, None
    
    candidate_hash = hash_backup_code(code)
    if candidate_hash in hashes:
        hashes.remove(candidate_hash)
        return True, json.dumps(hashes)
    return False, None

def create_mfa_challenge_token(usuario_id: str, correo: str, expires_minutes: int = 5) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode = {
        "usuario_id": str(usuario_id),
        "correo": correo,
        "type": "mfa_challenge",
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_mfa_challenge_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "mfa_challenge":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de desafío 2FA inválido."
            )
        usuario_id = payload.get("usuario_id")
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de desafío 2FA inválido o malformado."
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión del desafío 2FA ha expirado. Por favor ingresa tus credenciales nuevamente."
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de desafío 2FA inválido o alterado."
        )


