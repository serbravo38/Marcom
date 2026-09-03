import sys
import time
import httpx

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GATEWAY_URL = "http://localhost:8000"

def test_users_crud_and_self_update():
    print("====================================================")
    print("INICIANDO PRUEBAS DE CRUD DE USUARIOS Y AUTO-ACTUALIZACIÓN")
    print("====================================================\n")

    # 1. Login como Admin
    print("1. Autenticando como Administrador...")
    admin_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": "admin@marcom.cl", "clave": "admin123"})
    assert admin_resp.status_code == 200, f"Error admin login: {admin_resp.text}"
    admin_token = admin_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Administrador autenticado.")

    # 2. Admin crea un nuevo usuario
    ts = int(time.time() * 1000)
    user_email = f"empleado_{ts}@marcom.cl"
    initial_pass = "ClaveInicial123!"

    create_payload = {
        "rut": f"{(ts % 80000000) + 10000000}-{(ts % 9) + 1}",
        "correo": user_email,
        "clave": initial_pass,
        "nombre": "Carlos",
        "apellido": "González",
        "rol": "TECNICO_TERRENO",
        "activo": True
    }
    print(f"\n2. Administrador creando nuevo usuario ({user_email})...")
    create_resp = httpx.post(f"{GATEWAY_URL}/api/v1/usuarios", json=create_payload, headers=admin_headers)
    assert create_resp.status_code == 201, f"Error al crear usuario: {create_resp.text}"
    created_user = create_resp.json()
    user_id = created_user["usuario_id"]
    print(f"✅ Usuario creado exitosamente con ID: {user_id}")

    # 3. Nuevo usuario inicia sesión
    print("\n3. Iniciando sesión como el nuevo usuario...")
    login_user_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": user_email, "clave": initial_pass})
    assert login_user_resp.status_code == 200, f"Error al iniciar sesión: {login_user_resp.text}"
    user_token = login_user_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("✅ Usuario autenticado y token JWT obtenido.")

    # 4. Usuario actualiza sus propios datos (nombre, teléfono, dirección y cambia su contraseña)
    new_pass = "NuevaClaveSegura2026!#"
    update_payload = {
        "nombre": "Carlos Alberto",
        "apellido": "González Soto",
        "telefono": "+56912345678",
        "direccion": "Av. Las Condes 1234",
        "region": "Metropolitana",
        "comuna": "Las Condes",
        "clave_actual": initial_pass,
        "nueva_clave": new_pass
    }
    print("\n4. Usuario actualizando sus datos personales y contraseña (PUT /usuarios/me)...")
    update_resp = httpx.put(f"{GATEWAY_URL}/api/v1/usuarios/me", json=update_payload, headers=user_headers)
    assert update_resp.status_code == 200, f"Error al actualizar perfil propio: {update_resp.text}"
    updated_user = update_resp.json()
    assert updated_user["nombre"] == "Carlos Alberto"
    assert updated_user["apellido"] == "González Soto"
    assert updated_user["perfil"]["telefono"] == "+56912345678"
    assert updated_user["perfil"]["comuna"] == "Las Condes"
    print("✅ Datos personales y perfil actualizados exitosamente.")

    # 5. Validar que la nueva contraseña funciona
    print("\n5. Verificando inicio de sesión del usuario con la NUEVA contraseña...")
    new_login_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": user_email, "clave": new_pass})
    assert new_login_resp.status_code == 200, f"Error login con nueva clave: {new_login_resp.text}"
    print("✅ Inicio de sesión con la nueva contraseña exitoso.")

    # 6. Intentar auto-eliminación por el admin (debe ser bloqueado si es su propia cuenta)
    print("\n6. Verificando protección: Administrador no puede auto-eliminarse...")
    admin_me_resp = httpx.get(f"{GATEWAY_URL}/api/v1/usuarios/me", headers=admin_headers)
    admin_id = admin_me_resp.json()["usuario_id"]
    self_delete_resp = httpx.delete(f"{GATEWAY_URL}/api/v1/usuarios/{admin_id}", headers=admin_headers)
    assert self_delete_resp.status_code == 400, f"Debió rechazar auto-eliminación pero dio: {self_delete_resp.status_code}"
    print("✅ Protección confirmada: Admin no puede auto-eliminarse.")

    # 7. Administrador elimina la cuenta del usuario de prueba
    print(f"\n7. Administrador eliminando cuenta de usuario ({user_id})...")
    del_resp = httpx.delete(f"{GATEWAY_URL}/api/v1/usuarios/{user_id}", headers=admin_headers)
    assert del_resp.status_code == 204, f"Error al eliminar usuario: {del_resp.status_code} - {del_resp.text}"
    print("✅ Cuenta eliminada exitosamente por el administrador (HTTP 204 No Content).")

    # 8. Verificar que la cuenta eliminada ya NO puede iniciar sesión
    print("\n8. Verificando que la cuenta eliminada ya no puede acceder al sistema...")
    after_del_resp = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={"correo": user_email, "clave": new_pass})
    assert after_del_resp.status_code == 401, f"Usuario eliminado aún pudo iniciar sesión: {after_del_resp.status_code}"
    print("✅ Verificación exitosa: El usuario eliminado ya no existe en el sistema.")

    print("\n====================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE CRUD Y AUTO-ACTUALIZACIÓN PASARON EXITOSAMENTE!")
    print("====================================================")

if __name__ == "__main__":
    test_users_crud_and_self_update()
