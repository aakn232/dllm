import httpx
from typing import Optional

_async_client: Optional[httpx.AsyncClient] = None

def get_async_client() -> httpx.AsyncClient:
    """
    공유 싱글톤 httpx.AsyncClient 반환.
    요청마다 클라이언트를 새로 생성하지 않고 TCP 연결을 재사용하여 커넥션 누수를 방지함.
    """
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=15.0))
    return _async_client

async def close_async_client():
    """
    애플리케이션 종료 시 AsyncClient 세션을 정상 닫기.
    """
    global _async_client
    if _async_client is not None and not _async_client.is_closed:
        await _async_client.aclose()
        _async_client = None
