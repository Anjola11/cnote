from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    IS_PRODUCTION: bool

    JWT_KEY: str
    JWT_ALGORITHM: str
    ALLOWED_ORIGINS: list
    BREVO_API_KEY: str
    BREVO_SENDER_NAME: str
    BREVO_EMAIL: str 
    DATABASE_URL: str
    REDIS_URL: str

    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str 
    
    model_config = SettingsConfigDict(
        env_file =".env",
        extra = "ignore"
    )

Config = Settings()