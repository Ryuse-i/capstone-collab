import logging
from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    APP_NAME = os.getenv("APP_NAME")
    DEBUG = os.getenv("DEBUG")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    # Test DB
    TEST_DB_HOST = os.getenv("TEST_DB_HOST")
    TEST_DB_PORT = os.getenv("TEST_DB_PORT", "6543")
    TEST_DB_USER = os.getenv("TEST_DB_USER")
    TEST_DB_PASSWORD = os.getenv("TEST_DB_PASSWORD")
    SECRET_KEY: str = str(os.getenv("SECRET_KEY"))
    OPEN_ROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


settings = Settings()


# add logging in the processes of the website would show up in the console
def configure_logging() -> None:
    """Configure root logging. Call once, at app startup."""
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
