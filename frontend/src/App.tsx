import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from './store/useChatStore';
import { useSettingsStore } from './store/useSettingsStore';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { StatusDashboard } from './components/StatusDashboard';
import { CustomInstructionsModal } from './components/CustomInstructionsModal';
import { Menu, Sparkles, Activity } from 'lucide-react';

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
  const { fetchCustomInstructions } = useSettingsStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchCustomInstructions();
  }, []);


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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      />


      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* 상단 모바일/네비 헤더 */}
        <header className={`h-14 border-b px-4 flex items-center justify-between backdrop-blur-md transition-colors ${
          darkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-300/80 bg-white/70 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-1 ${darkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={goHome}
              className={`font-semibold text-sm truncate max-w-xs md:max-w-md text-left hover:opacity-80 transition-opacity cursor-pointer ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}
              title="홈 화면으로 이동"
            >
              {currentSession?.title || 'Diffusion Gemma'}
            </button>
          </div>

          {/* 우측 서버 상태 및 모델 배지 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusOpen(true)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="백엔드 상태 및 로그 점검"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Status</span>
            </button>

            <span className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${
              darkMode
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
            }`}>
              DiffusionGemma-26B
            </span>
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
