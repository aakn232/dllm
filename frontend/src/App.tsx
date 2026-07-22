import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from './store/useChatStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { StatusDashboard } from './components/StatusDashboard';
import { CustomInstructionsModal } from './components/CustomInstructionsModal';
import { ProfileModal } from './components/ProfileModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { Menu, Sparkles } from 'lucide-react';

const ChatView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { selectSession, goHome, currentSessionId } = useChatStore();

  useEffect(() => {
    if (sessionId) {
      if (sessionId !== currentSessionId) {
        selectSession(sessionId);
      }
    } else {
      if (currentSessionId !== null) {
        goHome();
      }
    }
  }, [sessionId]);

  return null;
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const {
    fetchSessions,
    messages,
    createSession,
    selectSession,
    darkMode,
    goHome
  } = useChatStore();
  const { fetchCustomInstructions } = useSettingsStore();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isProfileView, setIsProfileView] = useState(false);
  const [isPasswordView, setIsPasswordView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 앱 시작 시 인증 체크
  useEffect(() => {
    checkAuth();
  }, []);

  // 2. 인증 성공 시 세션 및 맞춤지침 패치 후 URL 경로 동기화
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions().then(() => {
        const path = window.location.pathname;
        if (path.startsWith('/c/')) {
          const sId = path.split('/c/')[1];
          if (sId) {
            selectSession(sId);
          }
        } else {
          goHome();
        }
      });
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
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, navigate]);

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

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <Routes>
        <Route path="/" element={<ChatView />} />
        <Route path="/c/:sessionId" element={<ChatView />} />
      </Routes>

      {/* 사이드바 */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenAdmin={() => { setIsAdminView(true); setIsProfileView(false); setIsPasswordView(false); }}
        onOpenProfile={() => { setIsProfileView(true); setIsPasswordView(false); }}
        onOpenPassword={() => { setIsPasswordView(true); setIsProfileView(false); }}
      />

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* 모바일 전용 사이드바 토글 버튼 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg border backdrop-blur-md shadow-sm transition-colors ${
            darkMode ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white' : 'border-slate-300 bg-white/80 text-slate-700 hover:text-black'
          }`}
          title={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        >
          <Menu className="w-5 h-5" />
        </button>

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

      {/* 백엔드 상태 점검 대시보드 모달 */}
      <StatusDashboard isOpen={statusOpen} onClose={() => setStatusOpen(false)} />

      {/* 맞춤 지침 설정 모달 */}
      <CustomInstructionsModal />

      {/* 프로필 정보 모달 (비밀번호 항목 제거된 정보 전용 모달) */}
      <ProfileModal isOpen={isProfileView} onClose={() => setIsProfileView(false)} />

      {/* 비밀번호 변경 모달 */}
      <PasswordChangeModal isOpen={isPasswordView} onClose={() => setIsPasswordView(false)} />
    </div>
  );
};

export default App;
