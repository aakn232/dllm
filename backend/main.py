from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import ADMIN_PASSWORD, ADMIN_USERNAME, ALLOWED_ORIGINS, ENV
from backend.database import Base, SessionLocal, engine
from backend.models import GlobalQuotaPolicy, User, UserQuota, UserSettings
from backend.routers import admin, auth, chat, custom_instructions, sessions, settings, status
from backend.security import get_password_hash

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NVIDIA DiffusionGemma AI Chatbot Backend",
    description="Backend Proxy & Status Monitoring Dashboard for Google DiffusionGemma 26B A4B IT",
    version="1.0.0",
)

if ENV == "development":
    cors_origins = ["http://localhost:5173", "http://localhost:3000"]
else:
    cors_origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(status.router)
app.include_router(custom_instructions.router)
app.include_router(settings.router)
app.include_router(admin.router)


def ensure_admin_account(db: Session):
    admin_user = db.query(User).filter(User.is_admin.is_(True)).first()
    if admin_user:
        return

    user = User(
        username=ADMIN_USERNAME,
        email=f"{ADMIN_USERNAME}@local.dev",
        hashed_password=get_password_hash(ADMIN_PASSWORD),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(UserSettings(user_id=user.id))
    db.add(UserQuota(user_id=user.id))
    db.commit()


def ensure_global_policy(db: Session):
    policy = db.query(GlobalQuotaPolicy).filter(GlobalQuotaPolicy.id == 1).first()
    if not policy:
        db.add(GlobalQuotaPolicy(id=1))
        db.commit()


@app.on_event("startup")
def startup_setup():
    db = SessionLocal()
    try:
        ensure_admin_account(db)
        ensure_global_policy(db)
    finally:
        db.close()


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "DiffusionGemma ChatGPT Proxy Backend",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
