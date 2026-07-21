import { useAuthStore } from '../store/useAuthStore';

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // 인증 만료 혹은 비인증 상태인 경우 강제 로그아웃
      useAuthStore.getState().logout();
    }

    return res;
  } catch (err) {
    console.error('API 호출 네트워크 오류:', err);
    throw err;
  }
}
