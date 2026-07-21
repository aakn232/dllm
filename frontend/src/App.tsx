import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from './store/useChatStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { StatusDashboard } from './components/StatusDashboard';
import { CustomInstructionsModal } from './components/CustomInstructionsModal';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { Menu, Sparkles, Activity, LogOut, Shield, User, Settings, KeyRound, Sliders } from 'lucide-react';

export const App: React.FC = () => {
  const {
    fetchSessions,
    messages,
    createSession,
    currentSessionId,
    sessions,
    darkMode,
    goHome
  } = useChatStore();
  const { fetchCustomInstructions, openModal: openCustomInstructionsModal } = useSettingsStore();
  const { isAuthenticated, isLoading, user, checkAuth, logout } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isProfileView, setIsProfileView] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    };
    if (settingsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsDropdownOpen]);

  // 1. 앱 시작 시 인증 체크
  useEffect(() => {
    checkAuth();
  }, []);

  // 2. 인증 성공 시에만 세션 및 맞춤지침 패치
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      fetchCustomInstructions();
    }
  }, [isAuthenticated]);

  // 테마 초기화 동기화
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    }
  }, [darkMode]);

  // 단축키 설정 (Ctrl+K: 새 대화)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center font-sans ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">인증 정보를 확인하는 중...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isAdminView && user?.is_admin) {
    return <AdminPage onBack={() => setIsAdminView(false)} />;
  }

  if (isProfileView) {
    return <UserSettingsPage onBack={() => setIsProfileView(false)} />;
  }

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 백엔드 상태 점검 대시보드 모달 */}
      <StatusDashboard isOpen={statusOpen} onClose={() => setStatusOpen(false)} />

      {/* 맞춤 지침 설정 모달 */}
      <CustomInstructionsModal />

      {/* 사이드바 */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenAdmin={() => { setIsAdminView(true); setIsProfileView(false); }}
        onOpenProfile={() => { setIsProfileView(true); setIsAdminView(false); }}
      />

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* 상단 모바일/네비 헤더 */}
        <header className={`h-14 border-b px-4 flex items-center justify-between backdrop-blur-md transition-colors ${
          darkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-300/80 bg-white/70 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-1 ${darkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={goHome}
              className={`font-semibold text-sm truncate hover:opacity-85 transition-opacity cursor-pointer text-left ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}
              title="홈 화면으로 이동"
            >
              {currentSession?.title || 'Diffusion Gemma'}
            </button>
          </div>

          {/* 우측 서버 상태, 유저 프로필, 관리자 메뉴 및 로그아웃 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 관리자 패널 버튼 */}
            {user?.is_admin && (
              <button
                onClick={() => setIsAdminView(true)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/60 border-slate-700 text-amber-400 hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-amber-600 hover:bg-slate-50 shadow-sm'
                }`}
                title="관리자 패널 열기"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">관리자</span>
              </button>
            )}

            {user?.is_admin && (
              <button
                onClick={() => setStatusOpen(true)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
                title="백엔드 상태 및 로그 점검"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">Status</span>
              </button>
            )}

            {/* 유저명 배지 */}
            <button
              onClick={() => { setIsProfileView(true); setIsAdminView(false); }}
              className={`hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-slate-800/50 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="사용자 설정 및 프로필 열기"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{user?.username}</span>
            </button>

            {/* 설정 드롭다운 메뉴 */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setSettingsDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
                title="설정 메뉴 열기"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">설정</span>
              </button>

              {settingsDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl py-1.5 z-50 transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <button
                    onClick={() => {
                      setSettingsDropdownOpen(false);
                      setIsProfileView(true);
                      setIsAdminView(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                      darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>비밀번호 변경</span>
                  </button>

                  <button
                    onClick={() => {
                      setSettingsDropdownOpen(false);
                      openCustomInstructionsModal();
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                      darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>맞춤 지침 설정</span>
                  </button>
                </div>
              )}
            </div>

            {/* 로그아웃 버튼 */}
            <button
              onClick={logout}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:text-slate-100 hover:border-slate-600'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
              }`}
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 메시지 리스트 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  Diffusion Gemma AI에 무엇이든 물어보세요
                </h3>
                <p className={`text-xs max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  NVIDIA NIM 기반 256토큰 병렬 디퓨전 모델과 텍스트 + 이미지 멀티모달 대화를 경험해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full py-4">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 하단 입력 영역 */}
        <ChatInput />
      </main>
    </div>
  );
};

export default App;
