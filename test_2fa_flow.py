import sys
import time
import httpx
import pyotp

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GATEWAY_URL = "http://localhost:8000"

def run_test():
    print("====================================================")
    print("INICIANDO PRUEBAS DE DOBLE FACTOR DE AUTENTICACIÓN (2FA)")
    print("====================================================\n")

    # 1. Login inicial con admin
    print("1. Autenticando como Admin con contraseña...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    })
    assert resp.status_code == 200, f"Error login: {resp.text}"
    data = resp.json()
    assert not data.get("requiere_mfa"), "El usuario no debería requerir 2FA aún"
    admin_token = data["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Login exitoso (sin 2FA requerido).")

    # 2. Configurar MFA (obtener QR y secreto)
    print("\n2. Solicitando configuración de MFA (/auth/mfa/configurar)...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/mfa/configurar", headers=headers)
    assert resp.status_code == 200, f"Error configurar MFA: {resp.text}"
    mfa_setup = resp.json()
    secret = mfa_setup["secreto_manual"]
    qr = mfa_setup["qr_codigo_base64"]
    assert secret, "Falta secreto manual"
    assert qr.startswith("data:image/png;base64,"), "El QR no tiene formato DataURL esperado"
    print(f"✅ Secreto TOTP generado: {secret[:6]}... (Longitud: {len(secret)})")
    print(f"✅ Código QR generado correctamente (Longitud base64: {len(qr)} bytes)")

    # 3. Intentar activar con código inválido
    print("\n3. Probando activación con código inválido...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/mfa/activar", headers=headers, json={
        "codigo_totp": "000000"
    })
    assert resp.status_code == 400, "Debería rechazar código incorrecto"
    print("✅ Rechazó correctamente el código 2FA inválido.")

    # 4. Activar MFA con código TOTP válido
    print("\n4. Generando código TOTP válido y activando MFA...")
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/mfa/activar", headers=headers, json={
        "codigo_totp": valid_code
    })
    assert resp.status_code == 200, f"Error activando MFA: {resp.text}"
    activation_data = resp.json()
    assert activation_data["mfa_habilitado"] is True
    backup_codes = activation_data["codigos_respaldo"]
    assert len(backup_codes) == 8, f"Se esperaban 8 códigos de respaldo, se obtuvieron {len(backup_codes)}"
    print(f"✅ 2FA activado exitosamente. Códigos de respaldo recibidos: {backup_codes[:3]}... (+5 más)")

    # 5. Iniciar sesión ahora que 2FA está activado
    print("\n5. Probando inicio de sesión (Paso 1: Credenciales)...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    })
    assert resp.status_code == 200, f"Error login paso 1: {resp.text}"
    step1_data = resp.json()
    assert step1_data.get("requiere_mfa") is True, "Debe requerir 2FA"
    temp_token = step1_data.get("token_temporal_mfa")
    assert temp_token, "Debe devolver token temporal de desafío MFA"
    print("✅ Paso 1 completado: requiere_mfa=True y token temporal emitido.")

    # 6. Paso 2 con código inválido
    print("\n6. Probando verificación de MFA con código incorrecto...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/verificar-mfa", json={
        "token_temporal": temp_token,
        "codigo_totp": "999999"
    })
    assert resp.status_code == 401, f"Debería rechazar código erróneo: {resp.text}"
    print("✅ Rechazó código de desafío incorrecto.")

    # 7. Paso 2 con código TOTP válido
    print("\n7. Probando verificación de MFA con código TOTP válido...")
    valid_code_2 = totp.now()
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/verificar-mfa", json={
        "token_temporal": temp_token,
        "codigo_totp": valid_code_2
    })
    assert resp.status_code == 200, f"Error verificar MFA: {resp.text}"
    final_auth = resp.json()
    assert final_auth.get("access_token"), "Debe devolver el access_token definitivo"
    assert final_auth.get("requiere_mfa") is False
    print("✅ Paso 2 completado exitosamente: Token de acceso JWT emitido.")

    # 8. Probar login usando un código de respaldo
    print("\n8. Probando login con un código de respaldo (Backup code)...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    })
    temp_token_2 = resp.json()["token_temporal_mfa"]
    used_backup_code = backup_codes[0]
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/verificar-mfa", json={
        "token_temporal": temp_token_2,
        "codigo_totp": used_backup_code
    })
    assert resp.status_code == 200, f"Error usando código de respaldo: {resp.text}"
    print(f"✅ Login exitoso con código de respaldo '{used_backup_code}'.")

    # 9. Verificar que el código de respaldo usado ya NO puede volver a usarse
    print("\n9. Verificando que el código de respaldo consumido sea de un solo uso...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    })
    temp_token_3 = resp.json()["token_temporal_mfa"]
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/verificar-mfa", json={
        "token_temporal": temp_token_3,
        "codigo_totp": used_backup_code
    })
    assert resp.status_code == 401, "El código de respaldo reutilizado debió ser rechazado"
    print("✅ Código de respaldo consumido rechazado correctamente (One-Time-Use garantizado).")

    # 10. Desactivar 2FA para dejar al admin en su estado normal
    print("\n10. Desactivando 2FA con clave y código vigente...")
    current_totp_code = totp.now()
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/mfa/desactivar", headers={"Authorization": f"Bearer {final_auth['access_token']}"}, json={
        "clave": "admin123",
        "codigo_totp": current_totp_code
    })
    assert resp.status_code == 200, f"Error desactivando 2FA: {resp.text}"
    print("✅ 2FA desactivado correctamente.")

    # 11. Verificar que el login normal funciona directamente
    print("\n11. Verificando login directo tras desactivación...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    })
    assert resp.status_code == 200
    assert not resp.json().get("requiere_mfa"), "Ya no debe requerir 2FA"
    assert resp.json().get("access_token"), "Debe devolver access_token directo"
    print("✅ Login directo restaurado con éxito.")

    print("\n====================================================")
    print("🎉 TODAS LAS PRUEBAS DE 2FA / MFA PASARON CON ÉXITO")
    print("====================================================")

if __name__ == "__main__":
    run_test()
