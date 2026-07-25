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

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Async HTTP client for forwarding requests
client = httpx.AsyncClient()

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
    # 1. Determine destination service based on route prefix
    target_service_url = None
    
    if path.startswith("api/v1/auth") or path.startswith("api/v1/users") or path.startswith("api/v1/agreements"):
        target_service_url = settings.AUTH_SERVICE_URL
    elif path.startswith("api/v1/locations") or path.startswith("api/v1/products") or path.startswith("api/v1/assets") or path.startswith("api/v1/movements"):
        target_service_url = settings.INVENTORY_SERVICE_URL
    elif path.startswith("api/v1/work-orders"):
        target_service_url = settings.WORK_ORDER_SERVICE_URL
    elif path.startswith("api/v1/orders") or path.startswith("api/v1/payments") or path.startswith("api/v1/dte-documents"):
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
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": "BadGatewayError",
                "message": f"Error al comunicarse con el microservicio correspondiente.",
                "detail": str(exc)
            }
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
