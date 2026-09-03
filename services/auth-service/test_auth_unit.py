import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_1234567890_test_secret"


from app.auth import create_password_reset_token, verify_password_reset_token
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

if __name__ == "__main__":
    test_password_reset_token_creation_and_validation()
    test_invalid_password_reset_token()
    print("✅ Todas las pruebas unitarias de tokens de recuperación pasaron con éxito.")
