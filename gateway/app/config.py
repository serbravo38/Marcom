import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    AUTH_SERVICE_URL: str
    INVENTORY_SERVICE_URL: str
    WORK_ORDER_SERVICE_URL: str
    BILLING_SERVICE_URL: str

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
