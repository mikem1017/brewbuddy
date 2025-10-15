from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Environment
    environment: Literal["development", "production"] = "development"
    debug: bool = True
    
    # Hardware
    hardware_mode: Literal["mock", "real"] = "mock"
    
    # Database
    database_url: str = "sqlite:///./brewbuddy.db"
    
    # Security
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    
    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "brewbuddy@localhost"
    
    # Control Loop
    control_loop_interval: int = 10
    hysteresis_temp: float = 0.5
    sensor_timeout: int = 60
    
    # External APIs
    brewfather_api_key: str = ""
    brewers_friend_api_key: str = ""
    weather_api_key: str = ""
    
    # WebSocket
    ws_heartbeat_interval: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()


