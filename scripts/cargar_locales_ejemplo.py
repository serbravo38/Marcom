"""
Script de Carga y Cruce de Datos de Locales de Instalación
Proyecto MARCOM

Este script permite cargar locales e instalaciones en la base de datos a través del API Gateway,
asociándolos automáticamente con sus respectivos convenios (cruce de datos).
"""

import sys
import json
import httpx

GATEWAY_URL = "http://localhost:8000"

# Locales de ejemplo organizados por convenio
LOCALES_POR_CONVENIO = [
    {
        "convenio_nombre": "Copec S.A.",
        "convenio_rut": "99.888.777-1",
        "locales": [
            {
                "codigo_local": "COP-001",
                "nombre": "Estación & Pronto Copec Kennedy",
                "direccion": "Av. Presidente Kennedy 5000",
                "comuna": "Las Condes",
                "region": "Región Metropolitana",
                "es_bodega": False,
                "nombre_encargado": "Carlos Soto",
                "telefono_encargado": "+56987654321",
                "correo_encargado": "csoto@copec.cl"
            },
            {
                "codigo_local": "COP-002",
                "nombre": "Pronto Copec Pudahuel Ruta 68",
                "direccion": "Ruta 68 Km 12",
                "comuna": "Pudahuel",
                "region": "Región Metropolitana",
                "es_bodega": False,
                "nombre_encargado": "María Rojas",
                "telefono_encargado": "+56911223344",
                "correo_encargado": "mrojas@copec.cl"
            },
            {
                "codigo_local": "COP-003",
                "nombre": "Pronto Copec Viña del Mar",
                "direccion": "Av. Libertad 1200",
                "comuna": "Viña del Mar",
                "region": "Valparaíso",
                "es_bodega": False,
                "nombre_encargado": "Rodrigo Fuentes",
                "telefono_encargado": "+56944332211",
                "correo_encargado": "rfuentes@copec.cl"
            },
            {
                "codigo_local": "COP-004",
                "nombre": "Pronto Copec Concepción Centro",
                "direccion": "Av. Los Carrera 780",
                "comuna": "Concepción",
                "region": "Biobío",
                "es_bodega": False,
                "nombre_encargado": "Andrea Valenzuela",
                "telefono_encargado": "+56977889900",
                "correo_encargado": "avalenzuela@copec.cl"
            }
        ]
    },
    {
        "convenio_nombre": "Arcoprime Ltda.",
        "convenio_rut": "77.654.321-2",
        "locales": [
            {
                "codigo_local": "ARCO-101",
                "nombre": "Tienda Pronto Arcoprime Vitacura",
                "direccion": "Av. Vitacura 3500",
                "comuna": "Vitacura",
                "region": "Región Metropolitana",
                "es_bodega": False,
                "nombre_encargado": "Felipe Araya",
                "telefono_encargado": "+56933221100",
                "correo_encargado": "faraya@arcoprime.cl"
            },
            {
                "codigo_local": "ARCO-102",
                "nombre": "Tienda Pronto Arcoprime La Florida",
                "direccion": "Av. Vicuña Mackenna 7000",
                "comuna": "La Florida",
                "region": "Región Metropolitana",
                "es_bodega": False,
                "nombre_encargado": "Camila Morales",
                "telefono_encargado": "+56955667788",
                "correo_encargado": "cmorales@arcoprime.cl"
            }
        ]
    }
]

def cargar_datos(admin_email="admin@marcom.cl", admin_pass="admin123"):
    print("==========================================================")
    print("INICIANDO CARGA MASIVA Y CRUCE DE LOCALES CON CONVENIOS")
    print("==========================================================\n")

    # 1. Iniciar sesión como Administrador
    try:
        login_res = httpx.post(f"{GATEWAY_URL}/api/v1/auth/iniciar-sesion", json={
            "correo": admin_email,
            "clave": admin_pass
        })
        if login_res.status_code != 200:
            print(f"❌ Error al autenticar admin: {login_res.status_code} - {login_res.text}")
            sys.exit(1)
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Autenticado exitosamente con rol Administrador.")
    except Exception as e:
        print(f"❌ No se pudo conectar al API Gateway en {GATEWAY_URL}. Error: {e}")
        sys.exit(1)

    # 2. Obtener convenios existentes
    conv_res = httpx.get(f"{GATEWAY_URL}/api/v1/convenios", headers=headers)
    convenios_existentes = conv_res.json() if conv_res.status_code == 200 else []
    convenio_map = {c["nombre_empresa"].lower(): c["convenio_id"] for c in convenios_existentes}

    total_locales_cargados = 0

    for grupo in LOCALES_POR_CONVENIO:
        c_nombre = grupo["convenio_nombre"]
        c_rut = grupo["convenio_rut"]

        # Buscar o crear convenio
        convenio_id = convenio_map.get(c_nombre.lower())
        if not convenio_id:
            print(f"\nCreando convenio: {c_nombre} ({c_rut})...")
            create_conv_res = httpx.post(f"{GATEWAY_URL}/api/v1/convenios", json={
                "nombre_empresa": c_nombre,
                "rut": c_rut,
                "limite_credito": 500000.0,
                "credito_usado": 0.0,
                "activo": True
            }, headers=headers)
            if create_conv_res.status_code == 201:
                convenio_id = create_conv_res.json()["convenio_id"]
                convenio_map[c_nombre.lower()] = convenio_id
                print(f"✅ Convenio '{c_nombre}' creado con ID: {convenio_id}")
            else:
                print(f"⚠️ No se pudo crear convenio {c_nombre}: {create_conv_res.text}")

        # Preparar locales asignando el convenio_id cruzado
        locales_payload = []
        for loc in grupo["locales"]:
            loc_data = dict(loc)
            loc_data["convenio_id"] = convenio_id
            locales_payload.append(loc_data)

        # Enviar carga masiva
        print(f"Cargando {len(locales_payload)} locales vinculados a '{c_nombre}'...")
        bulk_res = httpx.post(f"{GATEWAY_URL}/api/v1/ubicaciones/carga-masiva", json={"locales": locales_payload}, headers=headers)
        if bulk_res.status_code == 201:
            registrados = bulk_res.json()
            total_locales_cargados += len(registrados)
            print(f"✅ {len(registrados)} locales registrados/actualizados para '{c_nombre}'.")
            for r in registrados:
                print(f"   - [{r.get('codigo_local')}] {r.get('nombre')} ({r.get('comuna')}, {r.get('region')}) -> Encargado: {r.get('nombre_encargado')}")
        else:
            print(f"❌ Error en carga masiva para {c_nombre}: {bulk_res.status_code} - {bulk_res.text}")

    print("\n==========================================================")
    print(f"🎉 CARGA COMPLETADA CON ÉXITO. Total de locales cruzados: {total_locales_cargados}")
    print("==========================================================")

if __name__ == "__main__":
    cargar_datos()
