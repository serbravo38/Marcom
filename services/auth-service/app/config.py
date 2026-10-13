import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    PORT: int = 8001
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 5

    # Configuración de correo SMTP
    SMTP_HOST: str = "sunfire.mxrouting.net"
    SMTP_PORT: int = 465
    SMTP_USER: str = "contacto@marcomchile.cl"
    SMTP_PASSWORD: str = "Cont,99593#"
    SMTP_FROM: str = "contacto@marcomchile.cl"
    SMTP_USE_SSL: bool = True

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
