import sys
import time
import httpx

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GATEWAY_URL = "http://localhost:8000"

def test_cotizaciones_workflow():
    print("=================================================================")
    print("INICIANDO TEST E2E: MÓDULO DE COTIZACIONES PARA CONVENIOS")
    print("=================================================================\n")

    # 1. Login
    login_payload = {
        "correo": "admin@marcom.cl",
        "clave": "admin123"
    }
    try:
        res = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json=login_payload, timeout=10.0)
        if res.status_code != 200:
            print(f"❌ Error al autenticar admin: {res.status_code} - {res.text}")
            return False
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ 1. Autenticación exitosa.")
    except Exception as e:
        print(f"❌ No se pudo conectar al API Gateway: {e}")
        return False

    # 2. Crear Convenio de Prueba
    agr_payload = {
        "nombre_empresa": f"Copec Test {int(time.time()) % 1000}",
        "rut": f"96.888.{int(time.time()) % 1000:03d}-1",
        "limite_credito": 15000000.00,
        "credito_usado": 0.00,
        "activo": True
    }
    res = httpx.post(f"{GATEWAY_URL}/api/v1/convenios", json=agr_payload, headers=headers)
    if res.status_code != 201:
        print(f"❌ Error al crear convenio: {res.status_code} - {res.text}")
        return False
    convenio = res.json()
    convenio_id = convenio["convenio_id"]
    print(f"✅ 2. Convenio creado: {convenio['nombre_empresa']} (ID: {convenio_id})")

    # 3. Crear Local de Instalación
    loc_payload = {
        "codigo_local": f"COP-PUD-{int(time.time()) % 1000:03d}",
        "nombre": "Pronto Copec Pudahuel Aeropuerto",
        "direccion": "Av. Américo Vespucio 1200",
        "region": "Región Metropolitana",
        "comuna": "Pudahuel",
        "es_bodega": False,
        "convenio_id": convenio_id
    }
    res = httpx.post(f"{GATEWAY_URL}/api/v1/ubicaciones", json=loc_payload, headers=headers)
    if res.status_code != 201:
        print(f"❌ Error al crear local: {res.status_code} - {res.text}")
        return False
    local = res.json()
    ubicacion_id = local["ubicacion_id"]
    print(f"✅ 3. Local de instalación creado: {local['nombre']} (ID: {ubicacion_id})")

    # 4. Crear o buscar Producto (Monitor 65")
    prod_payload = {
        "sku": f"MON-SAMS-65-{int(time.time()) % 1000:03d}",
        "nombre": "Monitor Profesional Samsung 65 Pulgadas",
        "marca": "Samsung",
        "categoria": "Monitores",
        "pulgadas": 65.00,
        "descripcion": "Monitor profesional para punto de venta"
    }
    res = httpx.post(f"{GATEWAY_URL}/api/v1/productos", json=prod_payload, headers=headers)
    if res.status_code == 201:
        producto_id = res.json()["producto_id"]
    else:
        # Fallback a listar productos
        res_list = httpx.get(f"{GATEWAY_URL}/api/v1/productos", headers=headers)
        producto_id = res_list.json()[0]["producto_id"]
    print(f"✅ 4. Producto listo para cotización (ID: {producto_id})")

    # 5. Crear Cotización (Parámetros del Cliente: Local + Cantidad de Monitores + Día de Aprobación)
    print("\n5. Creando cotización con cálculo interno de kilometraje e instalación...")
    fecha_aprob = "2026-09-02T10:00:00Z"
    quot_payload = {
        "convenio_id": convenio_id,
        "ubicacion_id": ubicacion_id,
        "fecha_solicitud_aprobacion": fecha_aprob,
        "tipo_soporte": "ESTANDAR_CONVENIO",
        "items": [
            {
                "producto_id": producto_id,
                "cantidad": 3,
                "precio_unitario": 480000.0
            }
        ],
        "notas": "Instalación en tótem y cajas principales de Pronto Copec"
    }

    res = httpx.post(f"{GATEWAY_URL}/api/v1/cotizaciones", json=quot_payload, headers=headers)
    if res.status_code != 201:
        print(f"❌ Error al crear cotización: {res.status_code} - {res.text}")
        return False
    cotizacion = res.json()
    cotizacion_id = cotizacion["cotizacion_id"]
    numero_cot = cotizacion["numero_cotizacion"]
    
    print(f"✅ Cotización generada exitosamente:")
    print(f"   - N° Cotización: {numero_cot}")
    print(f"   - Estado: {cotizacion['estado']}")
    print(f"   - Día Solicitud Aprobación: {cotizacion['fecha_solicitud_aprobacion']}")
    print(f"   - Subtotal Equipos: ${cotizacion['monto_equipos']:,.2f}")
    print(f"   - Kilometraje calculado internamente: {cotizacion['distancia_km']} km -> ${cotizacion['monto_kilometraje']:,.2f}")
    print(f"   - Costo Instalación interna: ${cotizacion['costo_instalacion']:,.2f}")
    print(f"   - Costo Soporte interno: ${cotizacion['costo_soporte']:,.2f}")
    print(f"   - Subtotal Neto: ${cotizacion['subtotal_neto']:,.2f}")
    print(f"   - IVA (19%): ${cotizacion['monto_iva']:,.2f}")
    print(f"   - Monto Total: ${cotizacion['monto_total']:,.2f} CLP")

    # 6. Interacción: Cargar Orden de Compra y Aprobar
    print(f"\n6. Cargando Orden de Compra del cliente y aprobando cotización...")
    po_num = f"OC-COPEC-2026-{int(time.time()) % 10000:04d}"
    approve_payload = {
        "orden_compra_numero": po_num,
        "orden_compra_adjunto": "https://copec.cl/docs/ordenes/OC-2026-0099.pdf",
        "notas": "Orden de compra recibida y validada por el departamento de adquisiciones"
    }
    
    res = httpx.post(f"{GATEWAY_URL}/api/v1/cotizaciones/{cotizacion_id}/aprobar", json=approve_payload, headers=headers)
    if res.status_code != 200:
        print(f"❌ Error al aprobar cotización: {res.status_code} - {res.text}")
        return False
    
    cot_aprobada = res.json()
    print(f"✅ Cotización aprobada exitosamente:")
    print(f"   - Estado Actual: {cot_aprobada['estado']}")
    print(f"   - Orden de Compra: {cot_aprobada['orden_compra_numero']}")
    print(f"   - Fecha Aprobación: {cot_aprobada['fecha_aprobacion']}")
    print(f"   - Pedido de Facturación ID: {cot_aprobada['pedido_id']}")
    print(f"   - Orden de Trabajo en Terreno ID: {cot_aprobada['orden_trabajo_id']}")

    # 7. Verificar impacto en Crédito de Convenio
    print("\n7. Verificando impacto en crédito de convenio y órdenes...")
    res = httpx.get(f"{GATEWAY_URL}/api/v1/convenios", headers=headers)
    agrs = res.json()
    target_agr = next((a for a in agrs if a["convenio_id"] == convenio_id), None)
    if target_agr:
        print(f"   - Límite de Crédito: ${target_agr['limite_credito']:,.2f}")
        print(f"   - Crédito Utilizado: ${target_agr['credito_usado']:,.2f}")
        assert target_agr['credito_usado'] > 0, "El crédito utilizado debería haberse incrementado."
        print(f"✅ Crédito de convenio actualizado correctamente tras aprobar con OC.")

    print("\n=================================================================")
    print("🎉 ¡TODAS LAS PRUEBAS DE COTIZACIONES Y ORDEN DE COMPRA PASARON!")
    print("=================================================================")
    return True

if __name__ == "__main__":
    success = test_cotizaciones_workflow()
    sys.exit(0 if success else 1)
