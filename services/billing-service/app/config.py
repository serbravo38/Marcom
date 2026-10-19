import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    PORT: int = 8004
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    # Configuración Pasarela Flow (Chile) - Sandbox / Producción (cargado desde .env)
    FLOW_API_KEY: str = ""
    FLOW_SECRET_KEY: str = ""
    FLOW_SANDBOX: bool = True
    FLOW_URL: str = "https://sandbox.flow.cl/api"
    FRONTEND_URL: str = "https://marcomchile.cl"
    PUBLIC_API_URL: str = "https://marcomchile.cl"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
