import sys
import time
import httpx

GATEWAY_URL = "http://localhost:8000"

def run_tests():
    print("====================================================")
    print("INICIANDO PRUEBAS DE INTEGRACIÓN E2E (API GATEWAY)")
    print("====================================================\n")

    # 1. Verificar salud del Gateway
    try:
        response = httpx.get(f"{GATEWAY_URL}/health")
        if response.status_code != 200:
            print(f"❌ Gateway fuera de servicio (Status: {response.status_code})")
            sys.exit(1)
        print("✅ API Gateway en línea y saludable.")
    except Exception as e:
        print(f"❌ No se pudo conectar al Gateway en {GATEWAY_URL}. ¿Ejecutaste 'docker compose up -d'?")
        print(f"Error: {e}")
        sys.exit(1)

    # 2. Iniciar sesión como Administrador Semilla
    print("\n1. Iniciando sesión como administrador semilla...")
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
    print("✅ Sesión iniciada con administrador semilla.")

    # 3. Registrar Administrador
    admin_email = f"admin_{int(time.time())}@marcom.cl"
    register_payload = {
        "rut": f"12.345.678-{int(time.time()) % 10}",
        "correo": admin_email,
        "clave": "supersecurepassword",
        "nombre": "Admin",
        "apellido": "Test",
        "rol": "ADMIN",
        "activo": True
    }
    
    print(f"\n2. Registrando nuevo administrador ({admin_email}) usando token de admin semilla...")
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/registrar", json=register_payload, headers=seed_headers)
    if response.status_code != 201:
        print(f"❌ Error al registrar usuario: {response.status_code} - {response.text}")
        sys.exit(1)
    usuario_id = response.json()["usuario_id"]
    print(f"✅ Usuario registrado correctamente. ID: {usuario_id}")

    # 4. Login
    print("\n3. Iniciando sesión con el nuevo administrador para obtener token JWT...")
    login_payload = {
        "correo": admin_email,
        "clave": "supersecurepassword"
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json=login_payload)
    if response.status_code != 200:
        print(f"❌ Error al iniciar sesión: {response.status_code} - {response.text}")
        sys.exit(1)
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Autenticación exitosa. Token JWT obtenido.")

    # 5. Obtener perfil
    print("\n4. Obteniendo datos de mi perfil (/usuarios/me)...")
    response = httpx.get(f"{GATEWAY_URL}/api/v1/usuarios/me", headers=headers)
    if response.status_code != 200:
        print(f"❌ Error al obtener perfil: {response.status_code} - {response.text}")
        sys.exit(1)
    print(f"✅ Perfil cargado. Nombre: {response.json()['nombre']} {response.json()['apellido']}")

    # 6. Crear un Convenio (Auth Service)
    print("\n5. Creando convenio (enrutando a Auth Service)...")
    agreement_payload = {
        "nombre_empresa": "Copec S.A.",
        "rut": f"99.888.777-{int(time.time()) % 10}",
        "limite_credito": 75000.00,
        "credito_usado": 0.00,
        "activo": True
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/convenios", json=agreement_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear convenio: {response.status_code} - {response.text}")
        sys.exit(1)
    convenio_id = response.json()["convenio_id"]
    print(f"✅ Convenio creado. ID: {convenio_id}")

    # 7. Crear una Ubicación Bodega (Inventory Service)
    print("\n6. Creando ubicación en bodega (enrutando a Inventory Service)...")
    location_payload = {
        "nombre": "Bodega Central Pudahuel",
        "direccion": "Av. Américo Vespucio 1500",
        "region": "Región Metropolitana",
        "comuna": "Pudahuel",
        "es_bodega": True
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/ubicaciones", json=location_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear ubicación: {response.status_code} - {response.text}")
        sys.exit(1)
    ubicacion_id = response.json()["ubicacion_id"]
    print(f"✅ Ubicación Bodega creada. ID: {ubicacion_id}")

    # 8. Crear un Local de Instalación vinculado al Convenio
    print("\n7. Creando Local de Instalación con cruce a Convenio...")
    local_code = f"COP-{int(time.time()) % 1000:03d}"
    local_payload = {
        "codigo_local": local_code,
        "nombre": "Tienda Pronto Copec Las Condes",
        "direccion": "Av. Presidente Kennedy 5000",
        "region": "Región Metropolitana",
        "comuna": "Las Condes",
        "es_bodega": False,
        "convenio_id": convenio_id,
        "nombre_encargado": "Carlos Soto",
        "telefono_encargado": "+56987654321",
        "correo_encargado": "csoto@copec.cl",
        "activo": True
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/ubicaciones", json=local_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear local con convenio: {response.status_code} - {response.text}")
        sys.exit(1)
    local_id = response.json()["ubicacion_id"]
    print(f"✅ Local de instalación creado. Código: {local_code}, ID: {local_id}, Convenio: {convenio_id}")

    # 9. Carga Masiva de Locales (Bulk)
    print("\n8. Probando endpoint de carga masiva de locales...")
    bulk_payload = {
        "locales": [
            {
                "codigo_local": f"PRON-A-{int(time.time()) % 1000}",
                "nombre": "Pronto Copec Pudahuel Ruta 68",
                "direccion": "Ruta 68 Km 12",
                "region": "Región Metropolitana",
                "comuna": "Pudahuel",
                "es_bodega": False,
                "convenio_id": convenio_id,
                "nombre_encargado": "María Rojas",
                "telefono_encargado": "+56911223344"
            },
            {
                "codigo_local": f"PRON-B-{int(time.time()) % 1000}",
                "nombre": "Pronto Copec Viña del Mar",
                "direccion": "Av. Libertad 1200",
                "region": "Valparaíso",
                "comuna": "Viña del Mar",
                "es_bodega": False,
                "convenio_id": convenio_id
            }
        ]
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/ubicaciones/carga-masiva", json=bulk_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error en carga masiva de locales: {response.status_code} - {response.text}")
        sys.exit(1)
    print(f"✅ Carga masiva exitosa. {len(response.json())} locales creados.")

    # 10. Crear un Producto en Catálogo (Inventory Service)
    print("\n9. Registrando producto en catálogo (enrutando a Inventory Service)...")
    product_payload = {
        "sku": f"PROD-{int(time.time())}",
        "nombre": "Monitor Profesional 65 pulgadas",
        "marca": "Samsung",
        "categoria": "Monitores",
        "pulgadas": 65.00,
        "descripcion": "Monitor para sala de control"
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/productos", json=product_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear producto: {response.status_code} - {response.text}")
        sys.exit(1)
    producto_id = response.json()["producto_id"]
    print(f"✅ Producto registrado en catálogo. ID: {producto_id}")

    # 11. Crear Orden de Trabajo asociada al Local y Convenio (Work Order Service)
    print("\n10. Creando Orden de Trabajo asociada al nuevo local y convenio...")
    wo_payload = {
        "numero_orden": f"OT-{int(time.time())}",
        "convenio_cliente_id": convenio_id,
        "ubicacion_id": local_id,
        "tecnico_asignado_id": usuario_id,
        "estado": "PENDIENTE",
        "fecha_programada": "2026-09-01T10:00:00Z",
        "notas": "Instalación de monitor profesional en punto de venta."
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/ordenes-trabajo", json=wo_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear orden de trabajo: {response.status_code} - {response.text}")
        sys.exit(1)
    print(f"✅ Orden de trabajo creada exitosamente. N°: {wo_payload['numero_orden']}")

    print("\n====================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON CON ÉXITO!")
    print("Locales, cruces de datos, convenios y órdenes de trabajo funcionan perfectamente.")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
