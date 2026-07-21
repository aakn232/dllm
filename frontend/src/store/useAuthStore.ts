import { create } from 'zustand';
import { useChatStore } from './useChatStore';

const API_BASE = 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  loadUserSettings: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<{ is_available: boolean; message: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: '로그인에 실패했습니다.' }));
        throw new Error(errorData.detail || '로그인 실패');
      }

      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
      });
      
      // 설정 로드
      await get().loadUserSettings();
    } catch (err) {
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false });
      throw err;
    }
  },

  register: async (username, email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: '회원가입에 실패했습니다.' }));
        throw new Error(errorData.detail || '회원가입 실패');
      }

      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
      });
      
      // 설정 로드
      await get().loadUserSettings();
    } catch (err) {
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
    // useChatStore 홈으로 이동 및 세션 초기화
    useChatStore.getState().goHome();
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const user = await res.json();
        set({
          token,
          user,
          isAuthenticated: true,
        });
        await get().loadUserSettings();
      } else {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      }
    } catch (err) {
      console.error('인증 확인 오류:', err);
      // 오프라인 상태일 수 있으므로 일단 보존하되 세부 에러가 401일 때만 로그아웃할 수도 있으나 안전을 위해 유지
    } finally {
      set({ isLoading: false });
    }
  },

  loadUserSettings: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/settings/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const settings = await res.json();
        // 씽킹 모드 로그인/세션 로드시 항상 OFF로 초기화 (요구사항)
        useChatStore.getState().setEnableThinking(false);
        
        // 다크모드 설정 동기화
        if (useChatStore.getState().darkMode !== settings.dark_mode) {
          useChatStore.getState().toggleDarkMode();
        }
      }
    } catch (err) {
      console.error('사용자 설정을 로드하지 못했습니다:', err);
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    const { token } = get();
    if (!token) throw new Error('인증 토큰이 없습니다. 다시 로그인해 주세요.');

    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: '비밀번호 변경에 실패했습니다.' }));
      throw new Error(errorData.detail || '비밀번호 변경 실패');
    }
  },

  checkUsernameAvailability: async (username: string) => {
    const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: '아이디 중복 확인에 실패했습니다.' }));
      throw new Error(errorData.detail || '아이디 중복 확인 실패');
    }
    return await res.json();
  },
}));

