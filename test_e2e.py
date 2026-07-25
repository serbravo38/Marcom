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

    # 2. Registrar Administrador
    admin_email = f"admin_{int(time.time())}@marcom.cl"
    register_payload = {
        "rut": f"12.345.678-{int(time.time()) % 10}",
        "email": admin_email,
        "password": "supersecurepassword",
        "first_name": "Admin",
        "last_name": "Test",
        "role": "ADMIN",
        "is_active": True
    }
    
    print(f"\n1. Registrando nuevo administrador ({admin_email})...")
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/register", json=register_payload)
    if response.status_code != 201:
        print(f"❌ Error al registrar usuario: {response.status_code} - {response.text}")
        sys.exit(1)
    user_id = response.json()["user_id"]
    print(f"✅ Usuario registrado correctamente. ID: {user_id}")

    # 3. Login
    print("\n2. Iniciando sesión para obtener token JWT...")
    login_payload = {
        "email": admin_email,
        "password": "supersecurepassword"
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/auth/login", json=login_payload)
    if response.status_code != 200:
        print(f"❌ Error al iniciar sesión: {response.status_code} - {response.text}")
        sys.exit(1)
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Autenticación exitosa. Token JWT obtenido.")

    # 4. Obtener perfil
    print("\n3. Obteniendo datos de mi perfil (/users/me)...")
    response = httpx.get(f"{GATEWAY_URL}/api/v1/users/me", headers=headers)
    if response.status_code != 200:
        print(f"❌ Error al obtener perfil: {response.status_code} - {response.text}")
        sys.exit(1)
    print(f"✅ Perfil cargado. Nombre: {response.json()['first_name']} {response.json()['last_name']}")

    # 5. Crear un Convenio (Auth Service)
    print("\n4. Creando convenio (enrutando a Auth Service)...")
    agreement_payload = {
        "company_name": "Copec S.A.",
        "rut": f"99.888.777-{int(time.time()) % 10}",
        "credit_limit": 75000.00,
        "used_credit": 0.00,
        "is_active": True
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/agreements", json=agreement_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear convenio: {response.status_code} - {response.text}")
        sys.exit(1)
    agreement_id = response.json()["agreement_id"]
    print(f"✅ Convenio creado. ID: {agreement_id}")

    # 6. Crear una Ubicación (Inventory Service)
    print("\n5. Creando ubicación en bodega (enrutando a Inventory Service)...")
    location_payload = {
        "name": "Bodega Central Pudahuel",
        "address": "Av. Américo Vespucio 1500",
        "region": "Región Metropolitana",
        "is_warehouse": True
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/locations", json=location_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear ubicación: {response.status_code} - {response.text}")
        sys.exit(1)
    location_id = response.json()["location_id"]
    print(f"✅ Ubicación creada. ID: {location_id}")

    # 7. Crear un Producto en Catálogo (Inventory Service)
    print("\n6. Registrando producto en catálogo (enrutando a Inventory Service)...")
    product_payload = {
        "sku": f"PROD-{int(time.time())}",
        "name": "Monitor Profesional 65 pulgadas",
        "brand": "Samsung",
        "category": "Monitores",
        "size_inches": 65.00,
        "description": "Monitor para sala de control"
    }
    response = httpx.post(f"{GATEWAY_URL}/api/v1/products", json=product_payload, headers=headers)
    if response.status_code != 201:
        print(f"❌ Error al crear producto: {response.status_code} - {response.text}")
        sys.exit(1)
    product_id = response.json()["product_id"]
    print(f"✅ Producto registrado en catálogo. ID: {product_id}")

    print("\n====================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON CON ÉXITO!")
    print("El enrutamiento, base de datos y JWT funcionan correctamente.")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
