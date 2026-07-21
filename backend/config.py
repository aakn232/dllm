import os
from dotenv import load_dotenv

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_URL = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
MODEL_NAME = os.getenv("MODEL_NAME", "google/diffusiongemma-26b-a4b-it")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat_history.db")

# 환경 설정 (development / production)
ENV = os.getenv("ENV", "development")

# CORS 허용 Origin 목록 (쉼표 구분)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
