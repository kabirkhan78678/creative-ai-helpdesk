import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IT Fleet Management & Helpdesk API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database engine choice: "mysql" (default) or "sqlite"
    DB_ENGINE: str = os.getenv("DB_ENGINE", "mysql")
    
    # MySQL configurations
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "it_helpdesk_db")

    # SQLite config
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "./it_helpdesk.db")

    # Direct Cloud DATABASE_URL (Railway, Render, AWS RDS, Supabase, PlanetScale)
    RAW_DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    @property
    def DATABASE_URL(self) -> str:
        if self.RAW_DATABASE_URL:
            url = self.RAW_DATABASE_URL
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            elif url.startswith("mysql2://"):
                url = url.replace("mysql2://", "mysql+pymysql://", 1)
            if "charset=utf8mb4" not in url and "?" not in url:
                url += "?charset=utf8mb4"
            return url

        if self.DB_ENGINE.lower() == "mysql":
            # pymysql driver
            return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}?charset=utf8mb4"
        return f"sqlite:///{self.SQLITE_DB_PATH}"

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "cyber_neon_cyan_secret_token_9384729184")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

