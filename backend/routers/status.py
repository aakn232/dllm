import time
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx

from backend.config import NVIDIA_API_KEY, NVIDIA_API_URL, MODEL_NAME, DATABASE_URL
from backend.database import get_db
from backend.models import ChatSession, ChatMessage

router = APIRouter(prefix="/api/v1/status", tags=["status"])

# 서버 가동 시간 측정용
SERVER_START_TIME = time.time()

# 최근 에러 및 경고 로그를 수집하기 위한 커스텀 메모리 핸들러
class MemoryLogHandler(logging.Handler):
    def __init__(self, capacity: int = 50):
        super().__init__()
        self.capacity = capacity
        self.logs: List[Dict[str, Any]] = []

    def emit(self, record):
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name
        }
        self.logs.append(log_entry)
        if len(self.logs) > self.capacity:
            self.logs.pop(0)

memory_log_handler = MemoryLogHandler()
memory_log_handler.setLevel(logging.INFO)

# 루트 로거 및 주요 로거에 핸들러 등록
logger = logging.getLogger("status")
logging.getLogger().addHandler(memory_log_handler)

@router.get("")
async def get_system_status(db: Session = Depends(get_db)):
    """
    백엔드 전체 상태, DB 연결, NVIDIA API 키 및 핑 테스트, 최근 에러 로그 반환
    """
    uptime_seconds = int(time.time() - SERVER_START_TIME)

    # 1. DB 상태 검사
    db_status = "Healthy"
    db_error = None
    session_count = 0
    message_count = 0
    try:
        db.execute(text("SELECT 1"))
        session_count = db.query(ChatSession).count()
        message_count = db.query(ChatMessage).count()
    except Exception as e:
        db_status = "Unhealthy"
        db_error = str(e)

    # 2. NVIDIA API Key 유효성 및 Ping 테스트
    nvidia_key_set = bool(NVIDIA_API_KEY and not NVIDIA_API_KEY.startswith("nvapi-your-api-key"))
    nvidia_ping_ok = False
    nvidia_latency_ms = None
    nvidia_error = None

    if nvidia_key_set:
        start_ping = time.time()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # HEAD 또는 단순 GET 요청으로 핑 테스트
                resp = await client.get(
                    "https://integrate.api.nvidia.com/v1/models",
                    headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"}
                )
                nvidia_latency_ms = round((time.time() - start_ping) * 1000, 2)
                if resp.status_code == 200:
                    nvidia_ping_ok = True
                else:
                    nvidia_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            nvidia_error = f"통신 오류: {str(e)}"
    else:
        nvidia_error = "NVIDIA API Key가 설정되지 않았습니다 (.env 파일을 확인하세요)."

    # 3. 최근 에러/경고 로그
    recent_logs = [log for log in memory_log_handler.logs if log["level"] in ("WARNING", "ERROR", "CRITICAL")]
    all_recent_logs = list(reversed(memory_log_handler.logs[-20:]))

    return {
        "status": "Healthy" if (db_status == "Healthy" and nvidia_key_set) else "Degraded",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "uptime": {
            "seconds": uptime_seconds,
            "formatted": f"{uptime_seconds // 3600}시간 {(uptime_seconds % 3600) // 60}분 {uptime_seconds % 60}초"
        },
        "services": {
            "backend_server": {
                "name": "FastAPI Proxy Server",
                "status": "Online",
                "port": 8000
            },
            "database": {
                "name": "Database (PostgreSQL / Supabase)",
                "status": db_status,
                "error": db_error,
                "metrics": {
                    "total_sessions": session_count,
                    "total_messages": message_count
                }
            },
            "nvidia_nim_api": {
                "name": "NVIDIA NIM API Proxy",
                "model": MODEL_NAME,
                "api_url": NVIDIA_API_URL,
                "api_key_configured": nvidia_key_set,
                "ping_success": nvidia_ping_ok,
                "latency_ms": nvidia_latency_ms,
                "error": nvidia_error
            }
        },
        "logs": {
            "error_warning_count": len(recent_logs),
            "recent_logs": all_recent_logs
        }
    }
