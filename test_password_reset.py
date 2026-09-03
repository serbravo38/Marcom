import sys
import time
import httpx

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GATEWAY_URL = "http://localhost:8000"

def test_password_recovery():
    print("====================================================")
    print("INICIANDO PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA")
    print("====================================================\n")

    # 1. Iniciar sesión como Administrador Semilla para crear usuario de prueba
    print("1. Iniciando sesión como administrador semilla...")
    seed_login_payload = {
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json=seed_login_payload)
    if response.status_code != 200:
        print(f"❌ Error al iniciar sesión con administrador semilla: {response.status_code} - {response.text}")
        sys.exit(1)
    seed_token = response.json()["access_token"]
    seed_headers = {"Authorization": f"Bearer {seed_token}"}
    print("✅ Administrador autenticado.")

    # 2. Registrar usuario de prueba con contraseña inicial
    ts = int(time.time() * 1000)
    test_email = f"recuperacion_{ts}@marcom.cl"
    initial_password = "PasswordOriginal123!"
    new_password = "PasswordNuevo2026!#"

    register_payload = {
        "rut": f"{(ts % 80000000) + 10000000}-{(ts % 9) + 1}",
        "correo": test_email,
        "clave": initial_password,
        "nombre": "Usuario",
        "apellido": "Recuperacion",
        "rol": "CLIENTE_ESTANDAR",
        "activo": True
    }
    print(f"\n2. Registrando usuario de prueba ({test_email})...")
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/registrar", json=register_payload, headers=seed_headers)
    if response.status_code != 201:
        print(f"❌ Error al registrar usuario: {response.status_code} - {response.text}")
        sys.exit(1)
    print(f"✅ Usuario de prueba registrado correctamente.")

    # 3. Validar login con contraseña original
    print("\n3. Validando inicio de sesión inicial...")
    login_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": initial_password})
    assert login_resp.status_code == 200, f"Error en login inicial: {login_resp.text}"
    print("✅ Inicio de sesión con contraseña original exitoso.")

    # 4. Solicitar recuperación de contraseña
    print(f"\n4. Solicitando recuperación de contraseña para {test_email}...")
    solicitud_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/solicitar-recuperacion", json={"correo": test_email})
    if solicitud_resp.status_code != 200:
        print(f"❌ Error al solicitar recuperación: {solicitud_resp.status_code} - {solicitud_resp.text}")
        sys.exit(1)
    data = solicitud_resp.json()
    reset_token = data.get("token_temporal")
    assert reset_token is not None, "El token de recuperación no fue retornado"
    print(f"✅ Solicitud aceptada. Token generado correctamente.")

    # 5. Restablecer contraseña con el token
    print(f"\n5. Restableciendo contraseña a nueva clave...")
    reset_payload = {
        "token": reset_token,
        "nueva_clave": new_password
    }
    reset_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/restablecer-clave", json=reset_payload)
    if reset_resp.status_code != 200:
        print(f"❌ Error al restablecer clave: {reset_resp.status_code} - {reset_resp.text}")
        sys.exit(1)
    print(f"✅ Contraseña restablecida: {reset_resp.json().get('mensaje')}")

    # 6. Validar que la contraseña antigua ya NO funciona
    print("\n6. Verificando que la contraseña antigua sea rechazada...")
    old_login_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": initial_password})
    if old_login_resp.status_code == 401:
        print("✅ Correcto: La contraseña antigua fue rechazada con 401 Unauthorized.")
    else:
        print(f"❌ Error de seguridad: La clave antigua aún es aceptada (Status: {old_login_resp.status_code})")
        sys.exit(1)

    # 7. Validar que la NUEVA contraseña SI funciona
    print("\n7. Verificando inicio de sesión con la NUEVA contraseña...")
    new_login_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": test_email, "clave": new_password})
    if new_login_resp.status_code == 200 and "access_token" in new_login_resp.json():
        print("✅ Correcto: Inicio de sesión exitoso con la nueva contraseña y token JWT obtenido.")
    else:
        print(f"❌ Error: No se pudo iniciar sesión con la nueva contraseña (Status: {new_login_resp.status_code} - {new_login_resp.text})")
        sys.exit(1)

    print("\n====================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA PASARON EXITOSAMENTE!")
    print("====================================================")

if __name__ == "__main__":
    test_password_recovery()
