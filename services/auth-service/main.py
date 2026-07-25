import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.routes import router as auth_router

app = FastAPI(
    title="Servicio de Autenticación y Clientes (Auth Service) - MARCOM",
    description="Microservicio encargado del registro de usuarios, convenios de clientes, perfiles y autenticación JWT.",
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

# Centralized error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "Ha ocurrido un error interno en el servidor.",
            "detail": str(exc) if app.debug else None
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "DatabaseError",
            "message": "Ocurrió un problema con la persistencia de datos.",
            "detail": str(exc) if app.debug else None
        }
    )

# Healthcheck
@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "auth-service"}

# Include routers
app.include_router(auth_router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
