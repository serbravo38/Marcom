"""
Script de Importación y Sincronización de Locales EDS / Pantallas Franquiciados
Proyecto MARCOM

Lee el archivo Excel o CSV de Franquiciados/EDS, normaliza los datos (Regiones, Comunas, Zonas, Cantidad de Pantallas),
y los inserta/actualiza en la base de datos PostgreSQL vía SQL directo o API Gateway.
"""

import os
import sys
import csv
from pathlib import Path
import openpyxl
from dotenv import load_dotenv

# Configurar stdout para caracteres UTF-8 en Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

load_dotenv()

REGIONES_MAP = {
    1: "Región de Tarapacá",
    2: "Región de Antofagasta",
    3: "Región de Atacama",
    4: "Región de Coquimbo",
    5: "Región de Valparaíso",
    6: "Región del Libertador General Bernardo O'Higgins",
    7: "Región del Maule",
    8: "Región del Biobío",
    9: "Región de La Araucanía",
    10: "Región de Los Lagos",
    11: "Región de Aysén",
    12: "Región de Magallanes y de la Antártica Chilena",
    13: "Región Metropolitana",
    14: "Región de Los Ríos",
    15: "Región de Arica y Parinacota",
    16: "Región de Ñuble"
}

DEFAULT_EXCEL_PATH = r"c:\Users\chech\Downloads\Pantallas_Fraquiciados_07102021.xlsx"

def limpiar_texto(valor):
    if valor is None:
        return ""
    return str(valor).strip()

def parse_archivo(ruta_archivo=DEFAULT_EXCEL_PATH):
    p = Path(ruta_archivo)
    if not p.exists():
        local_p = Path(__file__).parent / "data" / "pantallas_franquiciados.csv"
        if local_p.exists():
            ruta_archivo = str(local_p)
            p = local_p
        else:
            raise FileNotFoundError(f"No se encontró el archivo en: {ruta_archivo}")

    locales = []
    
    if p.suffix.lower() in [".xlsx", ".xls"]:
        wb = openpyxl.load_workbook(ruta_archivo, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        
        # Omitir cabecera
        for r in rows[1:]:
            eds_raw = r[0]
            if eds_raw is None or str(eds_raw).strip() == "" or str(r[6]).lower() == "total":
                continue
            
            try:
                eds_num = int(eds_raw)
                codigo_local = f"EDS-{eds_num}"
            except (ValueError, TypeError):
                codigo_local = str(eds_raw).strip()
            
            zona = limpiar_texto(r[1])
            direccion = limpiar_texto(r[2])
            
            reg_num = r[3]
            try:
                reg_int = int(reg_num)
                region_nombre = REGIONES_MAP.get(reg_int, f"Región {reg_int}")
            except (ValueError, TypeError):
                region_nombre = limpiar_texto(reg_num) or "Región Metropolitana"
                
            provincia = limpiar_texto(r[4])
            comuna = limpiar_texto(r[5])
            
            try:
                pantallas = int(r[6]) if r[6] is not None else 3
            except (ValueError, TypeError):
                pantallas = 3
                
            try:
                precio_inst = float(r[7]) if r[7] is not None else 0.0
            except (ValueError, TypeError):
                precio_inst = 0.0
                
            try:
                precio_trans = float(r[8]) if r[8] is not None else 0.0
            except (ValueError, TypeError):
                precio_trans = 0.0
                
            nombre = f"EDS {codigo_local.replace('EDS-', '')} - {comuna.title() if comuna else 'Copec'}"
            
            locales.append({
                "codigo_local": codigo_local,
                "nombre": nombre,
                "direccion": direccion,
                "zona": zona,
                "region": region_nombre,
                "provincia": provincia.title() if provincia else None,
                "comuna": comuna.title() if comuna else None,
                "cantidad_pantallas": pantallas,
                "precio_instalacion_uf": precio_inst,
                "precio_transporte_uf": precio_trans,
                "es_bodega": False
            })
            
    elif p.suffix.lower() == ".csv":
        with open(ruta_archivo, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for r in reader:
                codigo_local = r.get("codigo_local") or r.get("EDS")
                if not codigo_local or "total" in str(codigo_local).lower():
                    continue
                if not str(codigo_local).startswith("EDS-"):
                    codigo_local = f"EDS-{codigo_local}"
                    
                locales.append({
                    "codigo_local": codigo_local,
                    "nombre": r.get("nombre") or f"EDS {codigo_local.replace('EDS-', '')} - {r.get('comuna', '').title()}",
                    "direccion": r.get("direccion") or r.get("Dirección", ""),
                    "zona": r.get("zona") or r.get("Zona", ""),
                    "region": r.get("region") or r.get("Región", "Región Metropolitana"),
                    "provincia": r.get("provincia") or r.get("Provincia", ""),
                    "comuna": r.get("comuna") or r.get("Comuna", ""),
                    "cantidad_pantallas": int(r.get("cantidad_pantallas", r.get("#Pantallas", 3))),
                    "precio_instalacion_uf": float(r.get("precio_instalacion_uf", r.get("Precio Instalación [UF]", 0.0)) or 0.0),
                    "precio_transporte_uf": float(r.get("precio_transporte_uf", r.get("Precio Transporte [UF]", 0.0)) or 0.0),
                    "es_bodega": False
                })

    return locales

def exportar_a_csv(locales, ruta_salida):
    Path(ruta_salida).parent.mkdir(parents=True, exist_ok=True)
    if not locales:
        return
    campos = [
        "codigo_local", "nombre", "direccion", "zona", "region", "provincia",
        "comuna", "cantidad_pantallas", "precio_instalacion_uf", "precio_transporte_uf", "es_bodega"
    ]
    with open(ruta_salida, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=campos)
        writer.writeheader()
        for loc in locales:
            writer.writerow(loc)
    print(f"OK: Archivo CSV generado en: {ruta_salida} ({len(locales)} locales)")

def sincronizar_directo_db(locales):
    """Importa o actualiza directamente en PostgreSQL si está disponible."""
    user = os.getenv("POSTGRES_USER", "marcom_user")
    password = os.getenv("POSTGRES_PASSWORD", "marcom_secure_password")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "marcom_db")
    
    try:
        import psycopg2
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        cur = conn.cursor()
        
        # 1. Asegurar columnas en tabla ubicaciones
        cur.execute("""
            ALTER TABLE esquema_inventario.ubicaciones
            ADD COLUMN IF NOT EXISTS zona VARCHAR(50),
            ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
            ADD COLUMN IF NOT EXISTS cantidad_pantallas INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS precio_instalacion_uf NUMERIC(10, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS precio_transporte_uf NUMERIC(10, 2) DEFAULT 0.00;
        """)
        
        # 2. Buscar o crear convenio Copec S.A.
        cur.execute("SELECT convenio_id FROM esquema_auth_clientes.convenios WHERE LOWER(nombre_empresa) LIKE '%copec%' LIMIT 1;")
        row = cur.fetchone()
        if row:
            convenio_id = row[0]
        else:
            cur.execute("""
                INSERT INTO esquema_auth_clientes.convenios (nombre_empresa, rut, limite_credito, credito_usado, activo)
                VALUES ('Copec S.A.', '99.888.777-1', 1000000.0, 0.0, TRUE)
                RETURNING convenio_id;
            """)
            convenio_id = cur.fetchone()[0]
            print(f"Convenio Copec S.A. creado con ID: {convenio_id}")
            
        # 3. UPSERT de cada local
        insertados = 0
        actualizados = 0
        
        for loc in locales:
            cur.execute("""
                INSERT INTO esquema_inventario.ubicaciones (
                    codigo_local, nombre, direccion, zona, region, provincia, comuna,
                    cantidad_pantallas, precio_instalacion_uf, precio_transporte_uf,
                    es_bodega, convenio_id, activo
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (codigo_local) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    direccion = EXCLUDED.direccion,
                    zona = EXCLUDED.zona,
                    region = EXCLUDED.region,
                    provincia = EXCLUDED.provincia,
                    comuna = EXCLUDED.comuna,
                    cantidad_pantallas = EXCLUDED.cantidad_pantallas,
                    precio_instalacion_uf = EXCLUDED.precio_instalacion_uf,
                    precio_transporte_uf = EXCLUDED.precio_transporte_uf,
                    convenio_id = COALESCE(esquema_inventario.ubicaciones.convenio_id, EXCLUDED.convenio_id),
                    actualizado_en = CURRENT_TIMESTAMP;
            """, (
                loc["codigo_local"], loc["nombre"], loc["direccion"], loc["zona"],
                loc["region"], loc["provincia"], loc["comuna"], loc["cantidad_pantallas"],
                loc["precio_instalacion_uf"], loc["precio_transporte_uf"], loc["es_bodega"],
                convenio_id
            ))
            insertados += 1
            
        conn.commit()
        cur.close()
        conn.close()
        print(f"OK DB: Se procesaron y actualizaron {insertados} locales EDS directamente en PostgreSQL.")
        return True
    except Exception as e:
        print(f"Info DB directa: {e}")
        return False

def sincronizar_con_gateway(locales, admin_email="admin@marcom.cl", admin_pass="admin123"):
    gateway_url = os.getenv("GATEWAY_URL", "http://localhost:8000")
    import httpx
    try:
        login_res = httpx.post(f"{gateway_url}/api/v1/auth/iniciar-sesion", json={
            "correo": admin_email,
            "clave": admin_pass
        }, timeout=5.0)
        if login_res.status_code != 200:
            return False
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    except Exception:
        return False

    try:
        conv_res = httpx.get(f"{gateway_url}/api/v1/convenios", headers=headers, timeout=5.0)
        convenios = conv_res.json() if conv_res.status_code == 200 else []
        copec_conv = next((c for c in convenios if "copec" in c["nombre_empresa"].lower()), None)
        
        if not copec_conv:
            create_res = httpx.post(f"{gateway_url}/api/v1/convenios", json={
                "nombre_empresa": "Copec S.A.",
                "rut": "99.888.777-1",
                "limite_credito": 1000000.0,
                "credito_usado": 0.0,
                "activo": True
            }, headers=headers)
            if create_res.status_code == 201:
                copec_conv = create_res.json()
        
        convenio_id = copec_conv["convenio_id"] if copec_conv else None

        payload_locales = []
        for loc in locales:
            loc_data = dict(loc)
            loc_data["convenio_id"] = convenio_id
            payload_locales.append(loc_data)

        bulk_res = httpx.post(
            f"{gateway_url}/api/v1/ubicaciones/carga-masiva",
            json={"locales": payload_locales},
            headers=headers,
            timeout=30.0
        )
        if bulk_res.status_code == 201:
            print(f"OK Gateway: Se sincronizaron {len(bulk_res.json())} locales vía API Gateway.")
            return True
    except Exception as e:
        print(f"Info Gateway: {e}")
    return False

if __name__ == "__main__":
    archivo_origen = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EXCEL_PATH
    print(f"Procesando archivo: {archivo_origen}")
    locales_parseados = parse_archivo(archivo_origen)
    print(f"Se extrajeron {len(locales_parseados)} locales válidos.")
    
    # Exportar CSV local
    csv_salida = Path(__file__).parent / "data" / "pantallas_franquiciados.csv"
    exportar_a_csv(locales_parseados, csv_salida)
    
    # Intentar sincronización directa a DB o Gateway
    if not sincronizar_directo_db(locales_parseados):
        sincronizar_con_gateway(locales_parseados)
