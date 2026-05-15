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


settings = Settings()
