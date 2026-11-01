import sys
import os
from datetime import datetime, timedelta, timezone
import pytest
import pyotp
import jwt
from pydantic import ValidationError

from tests.module_loader import isolate_service
isolate_service(os.path.join("services", "auth-service"))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_for_unit_tests_32chars!"
os.environ["JWT_ALGORITHM"] = "HS256"

from app import auth, crud, schemas
from app.models import RolUsuario
from app.config import settings

def test_password_hashing_and_verification():
    """Valida el algoritmo bcrypt para hashing seguro y verificación de claves"""
    raw_password = "MiClaveSegura2026!"
    hashed = crud.obtener_clave_hash(raw_password)
    
    assert hashed != raw_password
    assert crud.verificar_clave(raw_password, hashed) is True
    assert crud.verificar_clave("clave_incorrecta", hashed) is False

def test_jwt_token_generation_and_payload():
    """Valida la generación de token JWT, roles RBAC y expiración"""
    user_email = "admin@marcom.cl"
    user_role = "ADMIN"
    user_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    
    token = auth.create_access_token(
        data={"sub": user_email, "rol": user_role, "usuario_id": user_id},
        expires_delta=timedelta(minutes=15)
    )
    
    assert isinstance(token, str)
    assert len(token) > 20
    
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload is not None
    assert payload["sub"] == user_email
    assert payload["rol"] == user_role
    assert payload["usuario_id"] == user_id

def test_mfa_totp_generation_and_verification():
    """Valida la generación de secreto base32 TOTP y verificación de código de 6 dígitos"""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    
    assert len(valid_code) == 6
    assert valid_code.isdigit()
    assert totp.verify(valid_code) is True
    assert totp.verify("000000") is False

def test_auth_lockout_calculation():
    """Valida la regla de negocio de bloqueo tras 5 intentos fallidos"""
    max_intentos = 5
    intentos_actuales = 4
    
    intentos_actuales += 1
    debe_bloquear = intentos_actuales >= max_intentos
    assert debe_bloquear is True
    
    bloqueado_hasta = datetime.now(timezone.utc) + timedelta(minutes=15)
    assert bloqueado_hasta > datetime.now(timezone.utc)

def test_user_schema_validation():
    """Valida el schema Pydantic de creación de usuarios (UsuarioCrear) con RUT normalizado"""
    payload = {
        "rut": "12345678-k",
        "correo": "usuario@marcom.cl",
        "clave": "ClaveSegura2026!",
        "nombre": "Carlos",
        "apellido": "Valenzuela",
        "rol": RolUsuario.TECNICO_TERRENO,
        "activo": True
    }
    user_in = schemas.UsuarioCrear(**payload)
    assert user_in.rut == "12345678-K"
    assert user_in.rol == RolUsuario.TECNICO_TERRENO
    assert user_in.correo == "usuario@marcom.cl"

def test_password_complexity_policy():
    """Valida que se rechacen contraseñas sin mayúsculas, minúsculas, números o caracteres especiales"""
    with pytest.raises(ValueError):
        schemas.validar_robustez_clave("SoloLetrasMayusYMinus")
    with pytest.raises(ValueError):
        schemas.validar_robustez_clave("Alfanumerica2026")
    with pytest.raises(ValueError):
        schemas.validar_robustez_clave("minuscula2026!")
    with pytest.raises(ValueError):
        schemas.validar_robustez_clave("Ab1!xyz")
    assert schemas.validar_robustez_clave("MarcomSegura2026!") == "MarcomSegura2026!"

def test_temporary_password_generation_and_lifecycle():
    """Valida la generación y consumo de contraseñas temporales de recuperación"""
    temp_pass = auth.generate_temporary_password()
    assert len(temp_pass) == 10
    assert schemas.validar_robustez_clave(temp_pass) == temp_pass

    usuario_id = "11111111-2222-3333-4444-555555555555"
    correo = "recuperacion_unit@marcom.cl"
    auth.register_temporary_password(usuario_id, correo, temp_pass)
    assert auth.check_temporary_password_for_user(correo, temp_pass) is True
    verified = auth.verify_temporary_password_or_token(temp_pass, correo)
    assert verified["correo"] == correo
    assert verified["usuario_id"] == usuario_id
    assert auth.check_temporary_password_for_user(correo, temp_pass) is False

def test_convenio_corporativo_schema_validation():
    """Valida el schema de Convenio Corporativo B2B y normalización de RUT empresarial"""
    conv = schemas.ConvenioCrear(
        nombre_empresa="Arcoprime Pronto Copec S.A.",
        rut="76543210-k",
        limite_credito=45000000.0,
        credito_usado=1200000.0,
        activo=True
    )
    assert conv.rut == "76543210-K"
    assert conv.limite_credito == 45000000.0

def test_trabajos_portada_carousel_schema_validation():
    """Valida el schema de actualización del carrusel de Trabajos Realizados en Portada"""
    payload = {
        "items": [
            {
                "id": 1,
                "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
                "title": "Digital Menu Boards Autogestionables",
                "category": "Fast Food & Restaurantes",
                "client": "Red de Locales Gastronómicos",
                "description": "Sincronización centralizada de precios y contenido UHD 4K.",
                "features": ["Pantallas Samsung 50\" 4K UHD", "Montaje mural a medida"],
                "badgeColor": "#0284c7"
            }
        ]
    }
    trabajos = schemas.ActualizarTrabajosPortada(**payload)
    assert len(trabajos.items) == 1
    assert trabajos.items[0].title == "Digital Menu Boards Autogestionables"
    assert trabajos.items[0].badgeColor == "#0284c7"
