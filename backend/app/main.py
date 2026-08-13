import logging
from app.core.config import configure_logging
from fastapi import FastAPI
from app.api.api import api_router
from fastapi.middleware.cors import CORSMiddleware

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
