import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
import pytest
import jwt
from fastapi import HTTPException
from pydantic import ValidationError

from tests.module_loader import isolate_service

# ---------------------------------------------------------------------------
# SUITE DE PRUEBAS DE SEGURIDAD DEFENSIVA (OWASP API SECURITY / RBAC / JWT / 2FA)
# ---------------------------------------------------------------------------

def _load_auth_service():
    isolate_service(os.path.join("services", "auth-service"))
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_for_unit_tests_32chars!"
    os.environ["JWT_ALGORITHM"] = "HS256"
    from app import auth, schemas
    from app.config import settings
    return auth, schemas, settings

def _load_inventory_auth():
    isolate_service(os.path.join("services", "inventory-service"))
    os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_for_unit_tests_32chars!"
    os.environ["JWT_ALGORITHM"] = "HS256"
    from app import auth as inv_auth
    return inv_auth

def _load_work_order_service():
    isolate_service(os.path.join("services", "work-order-service"))
    os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_for_unit_tests_32chars!"
    os.environ["JWT_ALGORITHM"] = "HS256"
    from app import auth as wo_auth, schemas as wo_schemas
    return wo_auth, wo_schemas

def _load_billing_auth():
    isolate_service(os.path.join("services", "billing-service"))
    os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_for_unit_tests_32chars!"
    os.environ["JWT_ALGORITHM"] = "HS256"
    from app import auth as bill_auth
    return bill_auth


def test_security_jwt_tampered_signature_rejected():
    """[OWASP API2] Verifica que un token JWT firmado con una clave secreta atacante o firma adulterada sea rechazado (401)"""
    inv_auth = _load_inventory_auth()
    attacker_token = jwt.encode(
        {"usuario_id": str(uuid.uuid4()), "role": "ADMIN", "email": "hacker@evil.com"},
        "clave_secreta_falsa_del_atacante_000000000",
        algorithm="HS256"
    )
    with pytest.raises(HTTPException) as exc_info:
        inv_auth.verify_token(attacker_token)
    assert exc_info.value.status_code == 401


def test_security_jwt_expired_token_rejected():
    """[OWASP API2] Verifica que un token JWT expirado sea rechazado inmediatamente con HTTP 401 Unauthorized"""
    auth, _, _ = _load_auth_service()
    expired_token = auth.create_access_token(
        data={"sub": "admin@marcom.cl", "role": "ADMIN", "usuario_id": str(uuid.uuid4())},
        expires_delta=timedelta(minutes=-10)
    )
    inv_auth = _load_inventory_auth()
    with pytest.raises(HTTPException) as exc_info:
        inv_auth.verify_token(expired_token)
    assert exc_info.value.status_code == 401


def test_security_jwt_missing_or_empty_token_rejected():
    """[OWASP API2] Verifica que peticiones sin token (None o vacío) en endpoints protegidos lancen 401 Unauthorized"""
    inv_auth = _load_inventory_auth()
    with pytest.raises(HTTPException) as exc_info:
        inv_auth.verify_token(None)
    assert exc_info.value.status_code == 401

    with pytest.raises(HTTPException) as exc_info2:
        inv_auth.verify_token("")
    assert exc_info2.value.status_code == 401


def test_security_jwt_missing_usuario_id_claim_rejected():
    """[OWASP API2] Verifica que un token válido en firma pero sin el claim obligatorio usuario_id sea rechazado con 401"""
    _, _, settings = _load_auth_service()
    token_without_uid = jwt.encode(
        {"sub": "admin@marcom.cl", "role": "ADMIN"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    inv_auth = _load_inventory_auth()
    with pytest.raises(HTTPException) as exc_info:
        inv_auth.verify_token(token_without_uid)
    assert exc_info.value.status_code == 401


def test_security_rbac_privilege_escalation_blocked_inventory():
    """[OWASP API5] Verifica que require_role(['ADMIN']) en Inventario bloquee con 403 Forbidden a TECNICO_TERRENO y CLIENTE_CONVENIO"""
    inv_auth = _load_inventory_auth()
    checker = inv_auth.require_role(["ADMIN"])

    for unauthorized_role in ["TECNICO_TERRENO", "CLIENTE_CONVENIO", "CLIENTE_ESTANDAR"]:
        with pytest.raises(HTTPException) as exc_info:
            checker({"usuario_id": str(uuid.uuid4()), "role": unauthorized_role, "email": "user@marcom.cl"})
        assert exc_info.value.status_code == 403

    # Verifica que el rol ADMIN sí sea autorizado
    admin_data = {"usuario_id": str(uuid.uuid4()), "role": "ADMIN", "email": "admin@marcom.cl"}
    assert checker(admin_data) == admin_data


def test_security_rbac_privilege_escalation_blocked_billing():
    """[OWASP API5] Verifica que require_role(['ADMIN']) en Facturación/DTE bloquee con 403 Forbidden a roles no autorizados"""
    bill_auth = _load_billing_auth()
    checker = bill_auth.require_role(["ADMIN"])

    with pytest.raises(HTTPException) as exc_info:
        checker({"usuario_id": str(uuid.uuid4()), "role": "TECNICO_TERRENO", "email": "tec@marcom.cl"})
    assert exc_info.value.status_code == 403


def test_security_rbac_work_orders_role_matrix():
    """[OWASP API5] Verifica que en Órdenes de Trabajo los roles ADMIN y TECNICO_TERRENO pasen, pero CLIENTE_ESTANDAR reciba 403"""
    wo_auth, _ = _load_work_order_service()
    checker = wo_auth.require_role(["ADMIN", "TECNICO_TERRENO"])

    with pytest.raises(HTTPException) as exc_info:
        checker({"usuario_id": str(uuid.uuid4()), "role": "CLIENTE_ESTANDAR", "email": "cli@marcom.cl"})
    assert exc_info.value.status_code == 403

    tec_data = {"usuario_id": str(uuid.uuid4()), "role": "TECNICO_TERRENO", "email": "tec@marcom.cl"}
    assert checker(tec_data) == tec_data


def test_security_mfa_fernet_encryption_at_rest():
    """[Criptografía] Verifica que el secreto 2FA TOTP se cifre con Fernet (AES-128-CBC + HMAC) y sea reversible solo con la llave"""
    auth, _, _ = _load_auth_service()
    plain_secret = auth.generate_mfa_secret()
    encrypted = auth.encrypt_mfa_secret(plain_secret)

    assert encrypted != plain_secret
    assert len(encrypted) > 40
    decrypted = auth.decrypt_mfa_secret(encrypted)
    assert decrypted == plain_secret


def test_security_mfa_backup_codes_sha256_and_single_use():
    """[Seguridad 2FA] Verifica que los códigos de respaldo se guarden como hashes SHA-256 y se invaliden tras un solo uso (Anti-Replay)"""
    auth, _, _ = _load_auth_service()
    plain_codes, hashed_json = auth.generate_backup_codes(count=8)

    assert len(plain_codes) == 8
    first_code = plain_codes[0]
    assert first_code not in hashed_json  # Nunca en texto plano

    # Primer uso debe ser exitoso y remover el hash
    ok, updated_json = auth.verify_and_consume_backup_code(hashed_json, first_code)
    assert ok is True
    assert updated_json is not None

    # Segundo intento con el mismo código (Replay Attack) debe fallar
    replay_ok, _ = auth.verify_and_consume_backup_code(updated_json, first_code)
    assert replay_ok is False


def test_security_mfa_challenge_token_type_confusion_blocked():
    """[Seguridad 2FA] Impide que un token de sesión o de recuperación de clave se utilice como token de desafío MFA"""
    auth, _, _ = _load_auth_service()
    uid = str(uuid.uuid4())
    reset_token = auth.create_password_reset_token(uid, "user@marcom.cl")

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_mfa_challenge_token(reset_token)
    assert exc_info.value.status_code == 400


def test_security_password_reset_token_type_confusion_blocked():
    """[Seguridad Auth] Impide que un token de desafío MFA o JWT común sea aceptado para cambiar la contraseña"""
    auth, _, _ = _load_auth_service()
    uid = str(uuid.uuid4())
    mfa_token = auth.create_mfa_challenge_token(uid, "user@marcom.cl")

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_password_reset_token(mfa_token)
    assert exc_info.value.status_code == 400


def test_security_common_weak_passwords_dictionary_blocked():
    """[OWASP ASVS] Verifica el bloqueo de contraseñas comunes o de diccionario y claves sin complejidad"""
    _, schemas, _ = _load_auth_service()
    weak_candidates = ["12345678", "password123", "admin123", "qwerty123", "marcom2026", "sin_numeros!", "SIN_MINUSCULAS2026!"]
    for weak in weak_candidates:
        with pytest.raises(ValueError):
            schemas.validar_robustez_clave(weak)


def test_security_evidencia_xss_and_ssrf_schemes_blocked():
    """[OWASP API8 / Anti-XSS] Verifica el rechazo de esquemas maliciosos (javascript:, data:text/html, file://, ftp://) en evidencias"""
    _, wo_schemas = _load_work_order_service()
    malicious_uris = [
        "javascript:alert(document.cookie)",
        "vbscript:msgbox(1)",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "file:///etc/passwd",
        "ftp://evil.server.com/backdoor.sh"
    ]
    for bad_uri in malicious_uris:
        with pytest.raises(ValidationError):
            wo_schemas.EvidenciaTerrenoCrear(url_imagen=bad_uri, comentarios="Intento XSS/SSRF")
        with pytest.raises(ValidationError):
            wo_schemas.EvidenciaTerrenoCrear(url_imagen="https://marcom.cl/ok.jpg", url_firma=bad_uri)


def test_security_rut_sql_injection_and_malformed_blocked():
    """[OWASP API8 / Anti-SQLi] Verifica que payloads de inyección SQL o XSS en el campo RUT sean rechazados por RUT_REGEX"""
    _, schemas, _ = _load_auth_service()
    malicious_ruts = [
        "12345678-9' OR '1'='1",
        "12.345.678-9",
        "<script>alert(1)</script>",
        "12345678-9; DROP TABLE usuarios;--",
        "123-4"
    ]
    for bad_rut in malicious_ruts:
        with pytest.raises(ValueError):
            schemas.validar_formato_rut(bad_rut)
