import sys
import time
import httpx

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GATEWAY_URL = "http://localhost:8000"

def test_account_lockout_flow():
    print("====================================================")
    print("INICIANDO PRUEBAS DE BLOQUEO TEMPORAL DE CUENTAS")
    print("====================================================\n")

    # 1. Iniciar sesión como Administrador Semilla
    print("1. Autenticando como Administrador Semilla...")
    seed_login = {
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    }
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json=seed_login)
    if resp.status_code != 200:
        print(f"❌ Error al autenticar como admin: {resp.status_code} - {resp.text}")
        sys.exit(1)
    admin_token = resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Administrador autenticado correctamente.")

    # 2. Registrar nuevo usuario de prueba
    ts = int(time.time() * 1000)
    test_email = f"bloqueo_{ts}@marcom.cl"
    correct_password = "PasswordSegura123!"
    wrong_password = "PasswordIncorrecta999"

    register_payload = {
        "rut": f"{(ts % 80000000) + 10000000}-{(ts % 9) + 1}",
        "correo": test_email,
        "clave": correct_password,
        "nombre": "Usuario",
        "apellido": "BloqueoTest",
        "rol": "CLIENTE_ESTANDAR",
        "activo": True
    }
    print(f"\n2. Registrando usuario de prueba ({test_email})...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/registrar", json=register_payload, headers=admin_headers)
    if resp.status_code != 201:
        print(f"❌ Error al registrar usuario: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("✅ Usuario registrado exitosamente.")

    # 3. Validar login exitoso inicial
    print("\n3. Validando inicio de sesión inicial exitoso...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": correct_password})
    assert resp.status_code == 200, f"Error en login inicial: {resp.text}"
    print("✅ Login inicial exitoso.")

    # 4. Intentos fallidos 1 a 4 (deben retornar 401 Unauthorized)
    print("\n4. Ejecutando 4 intentos fallidos con contraseña errónea...")
    for i in range(1, 5):
        resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": wrong_password})
        assert resp.status_code == 401, f"Intento {i} debió responder 401 pero respondió {resp.status_code}: {resp.text}"
        print(f"  - Intento fallido {i}/5: Recibió 401 Unauthorized con mensaje '{resp.json().get('detail')}'")

    # 5. Quinto intento fallido (debe bloquear la cuenta y responder 429 Too Many Requests)
    print("\n5. Ejecutando el 5to intento fallido (debe activar bloqueo de 5 minutos)...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": wrong_password})
    if resp.status_code != 429:
        print(f"❌ Error de seguridad: El 5to intento fallido debió bloquear la cuenta con 429 pero respondió {resp.status_code}: {resp.text}")
        sys.exit(1)
    print(f"✅ Correcto: Cuenta bloqueada con HTTP 429 Too Many Requests.")
    print(f"  - Detalle: {resp.json().get('detail')}")
    print(f"  - Cabecera Retry-After: {resp.headers.get('retry-after')} segundos")

    # 6. Intentar iniciar sesión con la contraseña CORRECTA mientras está bloqueada
    print("\n6. Verificando que ni siquiera con la contraseña CORRECTA se permite el acceso mientras está bloqueada...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": correct_password})
    if resp.status_code != 429:
        print(f"❌ Error de seguridad: Usuario bloqueado pudo intentar login o no recibió 429: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"✅ Correcto: El intento con contraseña correcta sigue bloqueado con HTTP 429.")

    # 7. Desbloqueo mediante recuperación de contraseña
    print("\n7. Solicitando recuperación de contraseña para desbloquear...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/solicitar-recuperacion", json={"correo": test_email})
    assert resp.status_code == 200, f"Error al solicitar recuperación: {resp.text}"
    reset_token = resp.json()["token_temporal"]

    new_password = "PasswordDesbloqueada2026!#"
    print(f"8. Restableciendo contraseña con token...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/restablecer-clave", json={"token": reset_token, "nueva_clave": new_password})
    assert resp.status_code == 200, f"Error al restablecer contraseña: {resp.text}"
    print(f"✅ Contraseña restablecida.")

    # 9. Iniciar sesión con la nueva contraseña (debe funcionar inmediatamente)
    print("\n9. Verificando inicio de sesión inmediato con la nueva contraseña (desbloqueo verificado)...")
    resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": new_password})
    if resp.status_code != 200 or "access_token" not in resp.json():
        print(f"❌ Error: No se pudo iniciar sesión tras restablecer contraseña: {resp.status_code} - {resp.text}")
        sys.exit(1)
    new_token = resp.json()["access_token"]
    print("✅ Inicio de sesión exitoso y token JWT generado tras el desbloqueo.")

    # 10. Validar que los contadores en el perfil volvieron a cero
    resp = httpx.get(f"{GATEWAY_URL}/api/v1/usuarios/me", headers={"Authorization": f"Bearer {new_token}"})
    assert resp.status_code == 200
    user_data = resp.json()
    assert user_data.get("intentos_fallidos") == 0, f"intentos_fallidos debió ser 0 pero es {user_data.get('intentos_fallidos')}"
    assert user_data.get("bloqueado_hasta") is None, f"bloqueado_hasta debió ser None pero es {user_data.get('bloqueado_hasta')}"
    print("✅ Contadores de seguridad verificados: intentos_fallidos=0, bloqueado_hasta=None.")

    print("\n====================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE BLOQUEO TEMPORAL Y SEGURIDAD PASARON CON ÉXITO!")
    print("====================================================")

if __name__ == "__main__":
    test_account_lockout_flow()
