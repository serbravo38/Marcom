import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_1234567890_test_secret"


from datetime import datetime, timedelta, timezone
from app.auth import create_password_reset_token, verify_password_reset_token
from app.crud import verificar_clave_dummy, esta_cuenta_bloqueada
from app.models import Usuario
from fastapi import HTTPException

def test_password_reset_token_creation_and_validation():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    correo = "test@marcom.cl"
    
    # 1. Generar token
    token = create_password_reset_token(usuario_id=user_id, correo=correo, expires_minutes=10)
    assert token is not None and isinstance(token, str)
    
    # 2. Validar token correcto
    payload = verify_password_reset_token(token)
    assert payload["usuario_id"] == user_id
    assert payload["correo"] == correo
    assert payload["type"] == "password_reset"

def test_invalid_password_reset_token():
    # Token alterado
    try:
        verify_password_reset_token("invalid.token.structure")
        assert False, "Debería haber lanzado una excepción"
    except HTTPException as e:
        assert e.status_code == 400

def test_dummy_bcrypt_verification():
    # Validar que la función dummy hash procesa sin errores y retorna False
    result = verificar_clave_dummy("wrong_password_test")
    assert result is False

def test_esta_cuenta_bloqueada():
    # 1. Usuario sin bloqueo
    user_unlocked = Usuario(bloqueado_hasta=None, intentos_fallidos=0)
    bloqueado, segs = esta_cuenta_bloqueada(user_unlocked)
    assert bloqueado is False
    assert segs == 0

    # 2. Usuario con bloqueo en el futuro
    futuro = datetime.now(timezone.utc) + timedelta(minutes=5)
    user_locked = Usuario(bloqueado_hasta=futuro, intentos_fallidos=5)
    bloqueado, segs = esta_cuenta_bloqueada(user_locked)
    assert bloqueado is True
    assert segs > 0

    # 3. Usuario con bloqueo expirado (en el pasado)
    pasado = datetime.now(timezone.utc) - timedelta(minutes=1)
    user_expired = Usuario(bloqueado_hasta=pasado, intentos_fallidos=5)
    bloqueado, segs = esta_cuenta_bloqueada(user_expired)
    assert bloqueado is False
    assert segs == 0

if __name__ == "__main__":
    test_password_reset_token_creation_and_validation()
    test_invalid_password_reset_token()
    test_dummy_bcrypt_verification()
    test_esta_cuenta_bloqueada()
    print("✅ Todas las pruebas unitarias de autenticación y bloqueo pasaron con éxito.")
