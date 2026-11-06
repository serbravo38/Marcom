import subprocess
import sys
import os
import json
import time
from datetime import datetime

def generate_html_report(results, total_time, postman_stats):
    passed = sum(1 for r in results if r["status"] == "PASSED")
    failed = sum(1 for r in results if r["status"] == "FAILED")
    total = len(results)
    security_count = sum(1 for r in results if "Seguridad" in r["service"])
    pass_rate = round((passed / total) * 100, 1) if total > 0 else 0

    rows_html = ""
    for idx, r in enumerate(results, 1):
        badge_class = "badge-pass" if r["status"] == "PASSED" else "badge-fail"
        status_label = "APROBADO" if r["status"] == "PASSED" else "FALLIDO"
        is_sec = "Seguridad" in r["service"]
        service_badge_style = (
            "background: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.35);"
            if is_sec else
            "background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);"
        )
        rows_html += f"""
        <tr>
            <td>#{idx:02d}</td>
            <td><span class="service-tag" style="{service_badge_style}">{r['service']}</span></td>
            <td class="test-name">{r['name']}</td>
            <td>{r['description']}</td>
            <td><span class="badge {badge_class}">{status_label}</span></td>
        </tr>
        """

    postman_folders_html = ""
    for folder in postman_stats["folders"]:
        is_sec_folder = "Seguridad" in folder["name"]
        folder_border = "border-color: rgba(244, 63, 94, 0.45); background: rgba(244, 63, 94, 0.06);" if is_sec_folder else ""
        title_color = "#fda4af" if is_sec_folder else "#38bdf8"
        items_li = "".join(f"<li>• {item_name}</li>" for item_name in folder["items"])
        postman_folders_html += f"""
            <div style="background: rgba(15,23,42,0.6); padding: 16px; border-radius: 10px; border: 1px solid var(--border); {folder_border}">
                <strong style="color: {title_color}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span>{folder['name']}</span>
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.08); color: #e2e8f0;">{len(folder['items'])} pruebas</span>
                </strong>
                <ul style="color: var(--muted); font-size: 12.5px; padding-left: 14px; line-height: 1.65;">
                    {items_li}
                </ul>
            </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Oficial de Calidad (QA) & Seguridad Defensiva - Plataforma MARCOM</title>
    <style>
        :root {{
            --bg: #0f172a;
            --card: #1e293b;
            --text: #f8fafc;
            --muted: #94a3b8;
            --accent: #0ea5e9;
            --success: #10b981;
            --danger: #ef4444;
            --sec: #f43f5e;
            --border: #334155;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            padding: 32px;
            line-height: 1.5;
        }}
        .container {{ max-width: 1280px; margin: 0 auto; }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px 32px;
            margin-bottom: 28px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }}
        .header h1 {{ font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 6px; }}
        .header p {{ color: var(--muted); font-size: 14px; }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
            margin-bottom: 28px;
        }}
        .kpi-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            text-align: center;
        }}
        .kpi-value {{ font-size: 32px; font-weight: 800; margin-top: 6px; }}
        .kpi-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }}
        .text-success {{ color: var(--success); }}
        .text-accent {{ color: var(--accent); }}
        .text-danger {{ color: var(--danger); }}
        .text-sec {{ color: #fb7185; }}
        .section-card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 28px;
        }}
        .section-title {{
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
        }}
        table {{ width: 100%; border-collapse: collapse; font-size: 13.5px; }}
        th, td {{ padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); }}
        th {{ color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11.5px; }}
        tr:hover {{ background-color: rgba(255,255,255,0.02); }}
        .service-tag {{
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11.5px;
            display: inline-block;
        }}
        .test-name {{ font-family: 'Consolas', monospace; color: #e2e8f0; font-weight: 600; font-size: 12.5px; }}
        .badge {{
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
        }}
        .badge-pass {{ background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }}
        .badge-fail {{ background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }}
        .footer {{ text-align: center; color: var(--muted); font-size: 13px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>🛡️ Reporte Oficial de Pruebas QA & Seguridad Defensiva - MARCOM</h1>
                <p>Auditoría Automatizada de Microservicios, Lógica de Negocio, OWASP API Security, RBAC, JWT y Blindaje Perimetral</p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 13px; color: var(--muted);">Fecha de Ejecución</div>
                <div style="font-size: 16px; font-weight: 700; color: #38bdf8;">{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</div>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Pruebas Unitarias & Seguridad</div>
                <div class="kpi-value text-accent">{total}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Pruebas de Seguridad OWASP</div>
                <div class="kpi-value text-sec">{security_count}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Pruebas Aprobadas</div>
                <div class="kpi-value text-success">{passed}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Colección Postman / Newman</div>
                <div class="kpi-value text-accent">{postman_stats['total_requests']}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tasa de Éxito Global</div>
                <div class="kpi-value text-success">{pass_rate}% ({total_time:.2f}s)</div>
            </div>
        </div>

        <div class="section-card">
            <div class="section-title">
                <span>🧪 Matriz de Pruebas Automatizadas (Unitarias, Microservicios & Seguridad Defensiva)</span>
                <span style="font-size: 13px; color: var(--muted);">{passed} / {total} Aprobadas</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Módulo / Microservicio</th>
                        <th>Caso de Prueba (Pytest ID)</th>
                        <th>Objetivo de Validación / Regla de Seguridad</th>
                        <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>

        <div class="section-card">
            <div class="section-title">
                <span>📬 Cobertura de Colección Postman API & Seguridad (marcom_postman_collection.json)</span>
                <span style="font-size: 13px; color: #34d399;">{postman_stats['total_requests']} Endpoints & Pruebas de Seguridad Configuradas</span>
            </div>
            <p style="color: var(--muted); font-size: 14px; margin-bottom: 14px;">
                La colección oficial <code>marcom_postman_collection.json</code> incluye <strong>{postman_stats['total_requests']} pruebas automatizadas</strong> distribuidas en {len(postman_stats['folders'])} carpetas (incluyendo el módulo dedicado de <strong>Seguridad Defensiva OWASP, RBAC, JWT, 2FA y Anti-XSS/SQLi</strong>):
            </p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
                {postman_folders_html}
            </div>
        </div>

        <div class="footer">
            Plataforma de Gestión de Cartelería Digital MARCOM &copy; 2026 — Suite de Calidad y Seguridad Automatizada
        </div>
    </div>
</body>
</html>
"""
    with open("reporte_qa.html", "w", encoding="utf-8") as f:
        f.write(html_content)


def load_postman_stats():
    stats = {"total_requests": 0, "folders": []}
    try:
        with open("marcom_postman_collection.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        for folder in data.get("item", []):
            items = [req.get("name", "") for req in folder.get("item", [])]
            stats["folders"].append({"name": folder.get("name", ""), "items": items})
            stats["total_requests"] += len(items)
    except Exception:
        pass
    return stats


def main():
    print("=" * 88)
    print("  INICIANDO SUITE INTEGRAL DE PRUEBAS QA & SEGURIDAD DEFENSIVA - MARCOM (54 PRUEBAS)")
    print("=" * 88)

    test_cases = [
        # --- 01. Auth Service (9 pruebas) ---
        {"file": "tests/test_unit_auth.py", "func": "test_password_hashing_and_verification", "service": "Auth Service (:8001)", "desc": "Hashing criptográfico Bcrypt y verificación segura de contraseñas"},
        {"file": "tests/test_unit_auth.py", "func": "test_jwt_token_generation_and_payload", "service": "Auth Service (:8001)", "desc": "Emisión de token JWT HS256 con claims de rol RBAC y expiración"},
        {"file": "tests/test_unit_auth.py", "func": "test_mfa_totp_generation_and_verification", "service": "Auth Service (:8001)", "desc": "Generación y validación de códigos 2FA TOTP de 6 dígitos (PyOTP)"},
        {"file": "tests/test_unit_auth.py", "func": "test_auth_lockout_calculation", "service": "Auth Service (:8001)", "desc": "Política de bloqueo de cuenta por 15 min tras 5 intentos fallidos"},
        {"file": "tests/test_unit_auth.py", "func": "test_user_schema_validation", "service": "Auth Service (:8001)", "desc": "Validación de esquema Pydantic UsuarioCrear, RUT sin puntos y roles"},
        {"file": "tests/test_unit_auth.py", "func": "test_password_complexity_policy", "service": "Auth Service (:8001)", "desc": "Política de complejidad de claves (alfanumérica, mayúscula y símbolo)"},
        {"file": "tests/test_unit_auth.py", "func": "test_temporary_password_generation_and_lifecycle", "service": "Auth Service (:8001)", "desc": "Ciclo de vida y consumo de uso único para contraseñas temporales"},
        {"file": "tests/test_unit_auth.py", "func": "test_convenio_corporativo_schema_validation", "service": "Auth Service (:8001)", "desc": "Validación de Convenio Corporativo B2B y normalización de RUT empresa"},
        {"file": "tests/test_unit_auth.py", "func": "test_trabajos_portada_carousel_schema_validation", "service": "Auth Service (:8001)", "desc": "Validación del esquema de proyectos en Editor de Trabajos Realizados (Portada)"},

        # --- 02. Inventory Service & Códigos QR (10 pruebas) ---
        {"file": "tests/test_unit_inventory.py", "func": "test_ubicacion_crear_bodega", "service": "Inventory Service (:8002)", "desc": "Creación y validación de ubicaciones logísticas tipo Bodega Central"},
        {"file": "tests/test_unit_inventory.py", "func": "test_ubicacion_crear_local_convenio", "service": "Inventory Service (:8002)", "desc": "Vinculación de sucursales/locales comerciales a convenios corporativos"},
        {"file": "tests/test_unit_inventory.py", "func": "test_carga_masiva_locales", "service": "Inventory Service (:8002)", "desc": "Procesamiento de esquema de importación masiva de estaciones de servicio"},
        {"file": "tests/test_unit_inventory.py", "func": "test_catalogo_productos", "service": "Inventory Service (:8002)", "desc": "Validación de catálogo de monitores profesionales (SKU, marca, pulgadas)"},
        {"file": "tests/test_unit_inventory.py", "func": "test_catalogo_productos_actualizacion_parcial_galeria", "service": "Inventory Service (:8002)", "desc": "Edición individual de imágenes en galería de monitores sin recrear producto"},
        {"file": "tests/test_unit_inventory.py", "func": "test_activo_fisico_estados", "service": "Inventory Service (:8002)", "desc": "Trazabilidad de activos por número de serie, QR y estado operativo"},
        {"file": "tests/test_unit_inventory.py", "func": "test_movimiento_stock", "service": "Inventory Service (:8002)", "desc": "Registro de movimientos de inventario entre bodega de origen y local destino"},
        {"file": "tests/test_unit_inventory.py", "func": "test_ubicacion_actualizacion_tarifas_uf", "service": "Inventory Service (:8002)", "desc": "Actualización de tarifas de instalación y transporte en UF por sucursal"},
        {"file": "tests/test_unit_inventory.py", "func": "test_ficha_publica_qr_activo_respuesta_completa", "service": "Inventory Service (:8002)", "desc": "Ficha Pública QR (/activos/publico/{id}): Modelo, SKU, Serie, Ubicación exacta y Responsable"},
        {"file": "tests/test_unit_inventory.py", "func": "test_actualizacion_codigo_qr_etiqueta_activo", "service": "Inventory Service (:8002)", "desc": "Generación y actualización de etiqueta QR imprimible (QR-MC-*) y ubicación de televisor"},

        # --- 03. Work Order Service, Cámara Móvil & Firma Táctil de Recepción (8 pruebas) ---
        {"file": "tests/test_unit_work_orders.py", "func": "test_orden_trabajo_crear_valida", "service": "Work Order Service (:8003)", "desc": "Creación de Orden de Trabajo con asignación de técnico y fecha programada"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_orden_trabajo_estados_enum", "service": "Work Order Service (:8003)", "desc": "Máquina de estados de OT (PENDIENTE, ASIGNADA, EN_PROCESO, COMPLETADA, CANCELADA)"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_orden_trabajo_reapertura_y_edicion", "service": "Work Order Service (:8003)", "desc": "Edición y reapertura de Órdenes de Trabajo cerradas hacia EN_PROCESO"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_evidencia_firma_digital_validador_seguro", "service": "Work Order Service (:8003)", "desc": "Validación de firmas digitales Base64 y bloqueo de esquemas peligrosos"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_activos_orden_trabajo", "service": "Work Order Service (:8003)", "desc": "Asociación de activos instalados/retirados en órdenes de terreno"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_evidencia_ruta_local_permitida", "service": "Work Order Service (:8003)", "desc": "Aceptación de rutas locales seguras (/Monitores/...) y data URI en evidencias"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_cierre_movil_evidencia_foto_y_firma_tactil_recepcion", "service": "Work Order Service (:8003)", "desc": "Cierre móvil de OT con foto de cámara, firma táctil de recepción en teléfono y estado COMPLETADA"},
        {"file": "tests/test_unit_work_orders.py", "func": "test_evidencia_respuesta_incluye_firma_y_timestamp", "service": "Work Order Service (:8003)", "desc": "Persistencia de firma de recepción móvil (url_firma), responsable y timestamp en EvidenciaTerreno"},

        # --- 04. Billing Service (6 pruebas) ---
        {"file": "tests/test_unit_billing.py", "func": "test_calculo_financiero_cotizacion", "service": "Billing Service (:8004)", "desc": "Cálculo financiero automático (Equipos + Soporte + Instalación + KM + IVA 19%)"},
        {"file": "tests/test_unit_billing.py", "func": "test_cotizacion_aprobar_oc_validation", "service": "Billing Service (:8004)", "desc": "Validación de recepción de Orden de Compra (OC) para aprobación comercial"},
        {"file": "tests/test_unit_billing.py", "func": "test_documento_dte_schemas", "service": "Billing Service (:8004)", "desc": "Esquemas de Documentos Tributarios Electrónicos SII (Factura, Boleta, Guía)"},
        {"file": "tests/test_unit_billing.py", "func": "test_metodos_pago_disponibles", "service": "Billing Service (:8004)", "desc": "Validación de pasarelas de pago (Webpay, MercadoPago y Crédito Convenio)"},
        {"file": "tests/test_unit_billing.py", "func": "test_cotizacion_item_cantidad_positiva_obligatoria", "service": "Billing Service (:8004)", "desc": "Bloqueo de cantidades cero o negativas en ítems de cotización (Anti-Fraude)"},
        {"file": "tests/test_unit_billing.py", "func": "test_pago_crear_y_transaccion_pasarela", "service": "Billing Service (:8004)", "desc": "Validación de transacción aprobada en pasarela de pago con código de autorización"},

        # --- 05. API Gateway (5 pruebas) ---
        {"file": "tests/test_unit_gateway.py", "func": "test_gateway_rate_limiting_auth", "service": "API Gateway (:8000)", "desc": "Protección anti-fuerza bruta con Rate Limiting en rutas Auth (máx 60 req/min)"},
        {"file": "tests/test_unit_gateway.py", "func": "test_gateway_rate_limiting_general", "service": "API Gateway (:8000)", "desc": "Control de tráfico general por IP en el API Gateway (máx 300 req/min)"},
        {"file": "tests/test_unit_gateway.py", "func": "test_gateway_rate_limiting_window_expiry", "service": "API Gateway (:8000)", "desc": "Expiración y reciclaje automático de ventana deslizante de Rate Limit (60s)"},
        {"file": "tests/test_unit_gateway.py", "func": "test_gateway_rate_limiting_ip_isolation", "service": "API Gateway (:8000)", "desc": "Aislamiento por IP: el bloqueo de un atacante no afecta a usuarios legítimos"},
        {"file": "tests/test_unit_gateway.py", "func": "test_gateway_cors_origins_configured", "service": "API Gateway (:8000)", "desc": "Política estricta de orígenes permitidos CORS sin comodín abierto inseguro"},

        # --- 06. Módulo de Seguridad Defensiva OWASP / RBAC / JWT / 2FA / QR & Firma Móvil (16 pruebas) ---
        {"file": "tests/test_unit_security.py", "func": "test_security_jwt_tampered_signature_rejected", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API2] Rechazo de token JWT con firma criptográfica adulterada (401)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_jwt_expired_token_rejected", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API2] Rechazo inmediato de tokens JWT con tiempo de vida expirado (401)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_jwt_missing_or_empty_token_rejected", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API2] Bloqueo de peticiones anónimas sin token Bearer (401 Unauthorized)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_jwt_missing_usuario_id_claim_rejected", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API2] Rechazo de JWT con firma válida pero sin claim obligatorio usuario_id (401)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_rbac_privilege_escalation_blocked_inventory", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API5] Bloqueo de escalación vertical de privilegios en Inventario (403 Forbidden)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_rbac_privilege_escalation_blocked_billing", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API5] Bloqueo de emisión no autorizada en Facturación/DTE (403 Forbidden)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_rbac_work_orders_role_matrix", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP API5] Cumplimiento de matriz RBAC en Órdenes de Trabajo (403 a Cliente Estándar)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_mfa_fernet_encryption_at_rest", "service": "Seguridad OWASP & RBAC", "desc": "[Criptografía] Cifrado simétrico Fernet (AES-128-CBC + HMAC) de secretos 2FA en reposo"},
        {"file": "tests/test_unit_security.py", "func": "test_security_mfa_backup_codes_sha256_and_single_use", "service": "Seguridad OWASP & RBAC", "desc": "[Anti-Replay 2FA] Hashing SHA-256 e invalidación tras uso único de códigos de respaldo"},
        {"file": "tests/test_unit_security.py", "func": "test_security_mfa_challenge_token_type_confusion_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Seguridad 2FA] Prevención de confusión de tipo de token en verificación MFA (400)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_password_reset_token_type_confusion_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Seguridad Auth] Prevención de uso de token MFA para cambio de contraseña (400)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_common_weak_passwords_dictionary_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[OWASP ASVS] Bloqueo de contraseñas comunes de diccionario y claves vulnerables"},
        {"file": "tests/test_unit_security.py", "func": "test_security_evidencia_xss_and_ssrf_schemes_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Anti-XSS / SSRF] Bloqueo de payloads javascript:, data:text/html, file:// y ftp://"},
        {"file": "tests/test_unit_security.py", "func": "test_security_rut_sql_injection_and_malformed_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Anti-SQLi] Bloqueo de inyección SQL y caracteres maliciosos en validador de RUT"},
        {"file": "tests/test_unit_security.py", "func": "test_security_qr_public_endpoint_read_only_and_malformed_uuid_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Seguridad QR Público] Validación estricta UUID anti-SQLi y protección RBAC en escritura de QR (403)"},
        {"file": "tests/test_unit_security.py", "func": "test_security_firma_movil_tampered_uri_and_unauthorized_closure_blocked", "service": "Seguridad OWASP & RBAC", "desc": "[Seguridad Firma Móvil] Bloqueo de ejecutables/SVG malicioso en firma táctil y bloqueo de cierre por rol Cliente (403)"},
    ]

    results = []
    start_time = time.time()

    # Ejecución unificada de alta velocidad de los 54 casos de prueba con pytest
    venv_py = os.path.join(".venv", "Scripts", "python.exe")
    py_exec = venv_py if os.path.exists(venv_py) else sys.executable
    all_nodes = [f"{tc['file']}::{tc['func']}" for tc in test_cases]
    cmd = [py_exec, "-m", "pytest"] + all_nodes + ["-v", "--tb=short"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    stdout_text = proc.stdout + "\n" + proc.stderr

    for idx, tc in enumerate(test_cases, 1):
        node_id = f"{tc['file']}::{tc['func']}"
        node_id_win = node_id.replace("/", "\\")
        passed_match = (f"{node_id} PASSED" in stdout_text) or (f"{node_id_win} PASSED" in stdout_text)
        status = "PASSED" if passed_match else "FAILED"
        icon = "[OK]" if status == "PASSED" else "[FAIL]"
        print(f" {idx:02d}/{len(test_cases):02d} {icon} {tc['service']:<26} | {tc['func']}")
        results.append({
            "service": tc["service"],
            "name": tc["func"],
            "description": tc["desc"],
            "status": status
        })

    if any(r["status"] == "FAILED" for r in results):
        print("\n--- DETALLE DE SALIDA PYTEST ---")
        print(stdout_text)

    total_time = time.time() - start_time
    postman_stats = load_postman_stats()
    generate_html_report(results, total_time, postman_stats)

    passed = sum(1 for r in results if r["status"] == "PASSED")
    print("=" * 88)
    print(f"  RESUMEN EJECUTIVO: {passed}/{len(results)} PRUEBAS AUTOMATIZADAS APROBADAS ({total_time:.2f}s)")
    print(f"  COLECCION POSTMAN: {postman_stats['total_requests']} ENDPOINTS Y PRUEBAS DE SEGURIDAD CONFIGURADAS")
    print(f"  REPORTE VISUAL GENERADO EN: {os.path.abspath('reporte_qa.html')}")
    print("=" * 88)


if __name__ == "__main__":
    main()
