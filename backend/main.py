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

# CORS 설정 — 환경별 분리
if ENV == "development":
    # 개발 시에만 로컬 프론트엔드 허용
    cors_origins = ["http://localhost:5173", "http://localhost:3000"]
else:
    # 배포 시 ALLOWED_ORIGINS 환경변수에 명시된 도메인만 허용
    cors_origins = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
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
