import os
import uvicorn
import httpx
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings

app = FastAPI(
    title="API Gateway - MARCOM",
    description="Punto de entrada único para enrutamiento de peticiones hacia los microservicios.",
    version="1.0.0"
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

import time
from collections import defaultdict

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
    
    if path.startswith("api/v1/auth") or path.startswith("api/v1/usuarios") or path.startswith("api/v1/convenios") or path.startswith("api/v1/contacto"):
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
        
        # 6. Return response to client
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
