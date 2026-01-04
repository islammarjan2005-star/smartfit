from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SmartFit"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./smartfit.db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Service (OpenAI for image analysis)
    OPENAI_API_KEY: Optional[str] = None

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/wardrobe", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/outfits", exist_ok=True)
