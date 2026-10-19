import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    AUTH_SERVICE_URL: str
    INVENTORY_SERVICE_URL: str
    WORK_ORDER_SERVICE_URL: str
    BILLING_SERVICE_URL: str
    ALLOWED_ORIGINS: str = (
        "https://marcomchile.cl,https://www.marcomchile.cl,"
        "http://marcomchile.cl,http://www.marcomchile.cl,"
        "http://localhost,http://127.0.0.1,"
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:8000,http://127.0.0.1:8000"
    )

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
