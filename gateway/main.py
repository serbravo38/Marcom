import os
import json
import base64
import asyncio
import time
from collections import defaultdict
import uvicorn
import httpx
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings

app = FastAPI(
    title="API Gateway - MARCOM",
    description="Punto de entrada único para enrutamiento de peticiones hacia los microservicios e interceptor de auditoría.",
    version="1.1.0"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in settings.ALLOWED_ORIGINS.split(",")
    if origin.strip()
]

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|([a-zA-Z0-9-]+\.)?marcomchile\.cl)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# Async HTTP client for forwarding requests
client = httpx.AsyncClient()

# Rate Limiter en memoria: IP -> [timestamp1, timestamp2, ...]
_request_history = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # segundos
MAX_REQUESTS_PER_WINDOW = 300  # solicitudes por minuto por IP
MAX_AUTH_REQUESTS_PER_WINDOW = 60  # solicitudes de autenticación por minuto por IP


def _is_rate_limited(client_ip: str, path: str) -> bool:
    now = time.time()
    history = [t for t in _request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]
    _request_history[client_ip] = history

    limit = MAX_AUTH_REQUESTS_PER_WINDOW if "api/v1/auth" in path else MAX_REQUESTS_PER_WINDOW
    if len(history) >= limit:
        return True

    history.append(now)
    return False


def _decode_jwt_claims_unverified(auth_header: str) -> dict:
    """Extrae claims (usuario_id, email, role) del JWT para trazabilidad de auditoría en el Gateway."""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return {}
    token = auth_header.split(" ", 1)[1].strip()
    parts = token.split(".")
    if len(parts) != 3:
        return {}
    try:
        payload_b64 = parts[1]
        padding = "=" * (-len(payload_b64) % 4)
        decoded_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        data = json.loads(decoded_bytes.decode("utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _sanitize_audit_payload(raw_body: bytes) -> dict:
    """Limpia contraseñas y resume imágenes/firmas Base64 para el registro forense de auditoría."""
    if not raw_body:
        return {}
    try:
        parsed = json.loads(raw_body.decode("utf-8"))
        if not isinstance(parsed, dict):
            return {"resumen": f"Payload tipo {type(parsed).__name__}"}
        clean = {}
        sensitive_keys = {"clave", "nueva_clave", "clave_actual", "token", "token_temporal", "password", "secreto"}
        for k, v in parsed.items():
            if k.lower() in sensitive_keys:
                clean[k] = "***PROTEGIDO***"
            elif isinstance(v, str) and (v.startswith("data:image/") or len(v) > 300):
                if v.startswith("data:image/"):
                    clean[k] = f"[Imagen/Firma Digital Base64 ({len(v) // 1024} KB)]"
                else:
                    clean[k] = v[:280] + "..."
            elif isinstance(v, list) and len(v) > 5:
                clean[k] = f"[Lista con {len(v)} elementos]"
            else:
                clean[k] = v
        return clean
    except Exception:
        return {}


def _classify_movement(method: str, path: str, status_code: int, body_dict: dict) -> tuple[str, str, str]:
    """Traduce una petición HTTP a (modulo, accion, descripcion_legible_en_espanol)."""
    p = path.strip("/").lower()
    m = method.upper()

    # Clasificación de Módulo
    if "ordenes-trabajo" in p:
        modulo = "ORDENES_TRABAJO"
    elif any(x in p for x in ["ubicaciones", "productos", "activos", "movimientos"]):
        modulo = "INVENTARIO_QR"
    elif any(x in p for x in ["cotizaciones", "pedidos", "pagos", "documentos-dte"]):
        modulo = "FACTURACION_DTE"
    elif "trabajos-portada" in p:
        modulo = "PORTADA_CMS"
    elif any(x in p for x in ["usuarios", "convenios"]):
        modulo = "USUARIOS_CONVENIOS"
    else:
        modulo = "SESION_AUTH"

    # Si fue bloqueado por permisos (403)
    if status_code == 403:
        return modulo, "ACCESO_DENEGADO", f"Intento bloqueado por permisos RBAC (403) en {m} /{path}"

    # Clasificación de Acción y Descripción en español
    if "ordenes-trabajo" in p:
        if "evidencias" in p and m == "POST":
            tiene_firma = bool(body_dict.get("url_firma"))
            comentarios = str(body_dict.get("comentarios") or "")[:120]
            accion = "CIERRE_OT_FIRMA" if tiene_firma else "CREACION"
            desc = (
                f"Subió evidencia fotográfica y firma táctil de recepción en OT ({comentarios})"
                if tiene_firma else
                f"Subió fotografía de evidencia en terreno para OT ({comentarios})"
            )
            return modulo, accion, desc
        if "activos" in p and m == "POST":
            tipo = body_dict.get("tipo_accion", "VINCULACION")
            return modulo, "ACTUALIZACION", f"Vinculó activo en Orden de Trabajo (Acción: {tipo})"
        if m == "POST":
            num = body_dict.get("numero_orden", "")
            return modulo, "CREACION", f"Programó nueva Orden de Trabajo {num}".strip()
        if m in ("PATCH", "PUT"):
            nuevo_estado = body_dict.get("estado")
            if nuevo_estado == "COMPLETADA":
                return modulo, "CIERRE_OT_FIRMA", "Finalizó y cerró Orden de Trabajo como COMPLETADA"
            if nuevo_estado:
                return modulo, "ACTUALIZACION", f"Actualizó Orden de Trabajo (Nuevo estado: {nuevo_estado})"
            return modulo, "ACTUALIZACION", "Actualizó datos de Orden de Trabajo"

    if "activos" in p:
        if m == "POST":
            sn = body_dict.get("numero_serie", "")
            qr = body_dict.get("codigo_qr", "")
            return modulo, "CREACION", f"Registró nuevo televisor/activo seriado (SN: {sn}, QR: {qr})"
        if m in ("PATCH", "PUT"):
            qr = body_dict.get("codigo_qr")
            est = body_dict.get("estado_actual")
            return modulo, "ACTUALIZACION", f"Actualizó activo / etiqueta QR ({qr or est or 'Edición de ficha'})"

    if "movimientos" in p and m == "POST":
        motivo = body_dict.get("motivo", "Traslado de stock")
        return modulo, "CREACION", f"Registró movimiento de stock entre ubicaciones ({motivo})"

    if "ubicaciones" in p:
        if "carga-masiva" in p and m == "POST":
            return modulo, "CREACION", "Ejecutó carga masiva de sucursales/locales en inventario"
        if m == "POST":
            nom = body_dict.get("nombre", "")
            return modulo, "CREACION", f"Creó nueva ubicación/sucursal: {nom}"
        if m in ("PATCH", "PUT"):
            return modulo, "ACTUALIZACION", f"Actualizó datos o encargado de sucursal ({body_dict.get('nombre', '')})"
        if m == "DELETE":
            return modulo, "ELIMINACION", "Eliminó ubicación/sucursal del inventario"

    if "productos" in p:
        if m == "POST":
            return modulo, "CREACION", f"Creó producto en catálogo de monitores: {body_dict.get('nombre', '')} (SKU: {body_dict.get('sku', '')})"
        if m in ("PATCH", "PUT"):
            return modulo, "ACTUALIZACION", f"Actualizó ficha o galería de monitor en catálogo ({body_dict.get('nombre', 'Edición parcial')})"
        if m == "DELETE":
            return modulo, "ELIMINACION", "Eliminó monitor del catálogo de productos"

    if "cotizaciones" in p:
        if "aprobar-oc" in p:
            oc = body_dict.get("orden_compra_numero", "")
            return modulo, "ACTUALIZACION", f"Aprobó cotización comercial con Orden de Compra N° {oc}"
        if "rechazar" in p:
            return modulo, "ACTUALIZACION", "Rechazó cotización comercial"
        if m == "POST":
            return modulo, "CREACION", "Generó nueva cotización comercial para cliente"

    if "documentos-dte" in p and m == "POST":
        tipo_dte = body_dict.get("tipo_dte", "DTE")
        folio = body_dict.get("folio_sii", "")
        return modulo, "CREACION", f"Emitió Documento Tributario Electrónico SII ({tipo_dte} Folio {folio})"

    if "pagos" in p and m == "POST":
        metodo = body_dict.get("metodo_pago", "")
        return modulo, "CREACION", f"Registró pago comercial vía {metodo}"

    if "pedidos" in p and m == "POST":
        return modulo, "CREACION", "Creó nuevo pedido de compra/servicio"

    if "usuarios" in p:
        if m == "POST":
            return modulo, "CREACION", f"Creó cuenta de usuario: {body_dict.get('correo', '')} (Rol: {body_dict.get('rol', '')})"
        if m in ("PUT", "PATCH"):
            if p.endswith("/me"):
                return modulo, "ACTUALIZACION", "Actualizó sus propios datos de perfil / contraseña"
            return modulo, "ACTUALIZACION", f"Actualizó cuenta de usuario ({body_dict.get('correo', path)})"
        if m == "DELETE":
            return modulo, "ELIMINACION", f"Eliminó cuenta de usuario ({path})"

    if "convenios" in p:
        if m == "POST":
            return modulo, "CREACION", f"Creó convenio corporativo B2B: {body_dict.get('nombre_empresa', '')}"
        if m in ("PUT", "PATCH"):
            return modulo, "ACTUALIZACION", f"Actualizó convenio corporativo ({body_dict.get('nombre_empresa', path)})"
        if m == "DELETE":
            return modulo, "ELIMINACION", "Eliminó convenio corporativo"

    if "trabajos-portada" in p and m in ("PUT", "POST"):
        return modulo, "ACTUALIZACION", "Actualizó el carrusel de Trabajos Realizados en la portada web"

    if "mfa/activar" in p:
        return "SESION_AUTH", "MFA_ACTIVADO", "Activó la autenticación de dos factores (2FA/TOTP) en su cuenta"
    if "mfa/desactivar" in p:
        return "SESION_AUTH", "MFA_DESACTIVADO", "Desactivó la autenticación de dos factores (2FA/TOTP) en su cuenta"

    accion_default = {"POST": "CREACION", "PUT": "ACTUALIZACION", "PATCH": "ACTUALIZACION", "DELETE": "ELIMINACION"}.get(m, "MOVIMIENTO")
    return modulo, accion_default, f"Ejecutó operación {m} en /{path}"


async def _dispatch_gateway_audit(
    method: str,
    path: str,
    status_code: int,
    client_ip: str,
    user_agent: str,
    auth_header: str,
    raw_body: bytes
):
    """Envía en segundo plano el movimiento del usuario logueado hacia auth-service."""
    try:
        claims = _decode_jwt_claims_unverified(auth_header)
        usuario_id = claims.get("usuario_id")
        correo = claims.get("email") or claims.get("sub")
        rol = claims.get("role")

        # Solo auditar movimientos de usuarios autenticados o rechazos de seguridad (403)
        if not usuario_id and not correo and status_code != 403:
            return

        clean_body = _sanitize_audit_payload(raw_body)
        modulo, accion, descripcion = _classify_movement(method, path, status_code, clean_body)

        audit_payload = {
            "usuario_id": usuario_id,
            "correo_usuario": correo,
            "rol_usuario": rol,
            "modulo": modulo,
            "accion": accion,
            "descripcion": descripcion,
            "metodo_http": method.upper(),
            "ruta_endpoint": f"/{path.lstrip('/')}",
            "codigo_respuesta": status_code,
            "direccion_ip": client_ip,
            "dispositivo_user_agent": user_agent[:300],
            "detalle_json": json.dumps(clean_body, ensure_ascii=False) if clean_body else None
        }
        await client.post(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auditoria/registrar-evento",
            json=audit_payload,
            timeout=5.0
        )
    except Exception:
        pass


@app.on_event("shutdown")
async def shutdown_event():
    await client.aclose()


# Health check
@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "services": {
            "auth-service": settings.AUTH_SERVICE_URL,
            "inventory-service": settings.INVENTORY_SERVICE_URL,
            "work-order-service": settings.WORK_ORDER_SERVICE_URL,
            "billing-service": settings.BILLING_SERVICE_URL
        }
    }


# Wildcard router to proxy all requests to microservices
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def gateway_proxy(request: Request, path: str):
    # Control de saturación (Rate Limiting) por IP real (considerando Reverse Proxy Nginx)
    forwarded_for = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    elif real_ip:
        client_ip = real_ip.strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    if request.method != "OPTIONS" and _is_rate_limited(client_ip, path):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "RateLimitExceeded",
                "message": "Demasiadas solicitudes. Por favor espera un momento antes de reintentar."
            },
            headers={"Retry-After": "60"}
        )

    # 1. Determine destination service based on route prefix
    target_service_url = None

    if (
        path.startswith("api/v1/auth")
        or path.startswith("api/v1/usuarios")
        or path.startswith("api/v1/convenios")
        or path.startswith("api/v1/contacto")
        or path.startswith("api/v1/auditoria")
    ):
        target_service_url = settings.AUTH_SERVICE_URL
    elif path.startswith("api/v1/ubicaciones") or path.startswith("api/v1/productos") or path.startswith("api/v1/activos") or path.startswith("api/v1/movimientos"):
        target_service_url = settings.INVENTORY_SERVICE_URL
    elif path.startswith("api/v1/ordenes-trabajo"):
        target_service_url = settings.WORK_ORDER_SERVICE_URL
    elif path.startswith("api/v1/pedidos") or path.startswith("api/v1/pagos") or path.startswith("api/v1/documentos-dte") or path.startswith("api/v1/cotizaciones"):
        target_service_url = settings.BILLING_SERVICE_URL

    if not target_service_url:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "NotFoundError", "message": f"La ruta /{path} no coincide con ningún servicio disponible."}
        )

    # 2. Build target URL
    url = f"{target_service_url}/{path}"

    # 3. Read request body if present
    body = await request.body()

    # 4. Prepare headers (exclude Host header to prevent issues)
    headers = dict(request.headers)
    headers.pop("host", None)

    # 5. Forward request using httpx client
    try:
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=request.query_params,
            content=body,
            timeout=30.0
        )

        # 6. Interceptor de Auditoría: registrar movimientos (POST/PUT/PATCH/DELETE) o bloqueos RBAC (403)
        norm_path = path.strip("/").lower()
        excluded_audit_paths = {
            "api/v1/auth/iniciar-sesion",
            "api/v1/auth/verificar-mfa",
            "api/v1/auditoria/registrar-evento",
            "api/v1/contacto"
        }
        should_audit = (
            norm_path not in excluded_audit_paths
            and (
                (request.method in ("POST", "PUT", "PATCH", "DELETE") and response.status_code < 400)
                or response.status_code == 403
            )
        )
        if should_audit:
            auth_hdr = request.headers.get("authorization") or ""
            ua_hdr = request.headers.get("user-agent") or "Navegador Web"
            asyncio.create_task(
                _dispatch_gateway_audit(
                    method=request.method,
                    path=path,
                    status_code=response.status_code,
                    client_ip=client_ip,
                    user_agent=ua_hdr,
                    auth_header=auth_hdr,
                    raw_body=body
                )
            )

        # 7. Return response to client
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.RequestError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": "BadGatewayError",
                "message": "Error al comunicarse con el microservicio correspondiente."
            }
        )

if __name__ == "__main__":
    reload_enabled = os.getenv("UVICORN_RELOAD", "false").lower() == "true"
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=reload_enabled)
