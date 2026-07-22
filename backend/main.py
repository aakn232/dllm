import sys
from pathlib import Path

# Vercel 등 서벌리스 환경에서 backend 모듈을 찾을 수 있도록 루트 경로 추가
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.config import ENV, ALLOWED_ORIGINS
from backend.routers import chat, sessions, status, custom_instructions, auth, settings, admin

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NVIDIA DiffusionGemma AI Chatbot Backend",
    description="Backend Proxy & Status Monitoring Dashboard for Google DiffusionGemma 26B A4B IT",
    version="1.0.0"
)

# CORS 설정 — 대괄호/공백/와일드카드 안전 처리
raw_origins = ALLOWED_ORIGINS.strip().strip("[]").strip()

default_local_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

if ENV == "development":
    cors_origins = list(default_local_origins)
    if cleaned_origins := raw_origins:
        if cleaned_origins != "*":
            for o in cleaned_origins.split(","):
                co = o.strip().rstrip('/')
                if co and co not in cors_origins:
                    cors_origins.append(co)
        else:
            cors_origins = ["*"]
else:
    if not raw_origins or raw_origins == "*":
        cors_origins = ["*"]
    else:
        cors_origins = [o.strip().rstrip('/') for o in raw_origins.split(",") if o.strip()]
        # 기본 로컬도 포함
        for loc in default_local_origins:
            if loc not in cors_origins:
                cors_origins.append(loc)

# "*" 이 cors_origins에 포함되어 있다면 allow_credentials는 False여야 FastAPI/브라우저 오류가 없음
allow_credentials = True
if "*" in cors_origins:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(settings.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(status.router)
app.include_router(custom_instructions.router)


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "DiffusionGemma ChatGPT Proxy Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
