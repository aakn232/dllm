import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Plus, MessageSquare, Trash2, Edit2, Check, Search, 
  Sun, Moon, Activity, Sliders, Shield, LogOut,
  SquarePen, ChevronRight, KeyRound
} from 'lucide-react';

// 사진 2 스타일 사이드바 패널 토글(접기/열기) 아이콘
export const SidebarToggleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenStatus: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  onOpenPassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  onOpenStatus, 
  onOpenAdmin, 
  onOpenProfile,
  onOpenPassword
}) => {
  const navigate = useNavigate();
  const {
    sessions,
    currentSessionId,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    goHome,
    darkMode,
    toggleDarkMode
  } = useChatStore();
  const { openModal: openCustomInstructionsModal } = useSettingsStore();
  const { user, logout } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // 팝업 바깥 클릭 시 닫기 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const query = searchQuery.trim().toLowerCase();
  const filteredSessions = sessions.filter(s => {
    if (!query) return true;
    const titleMatch = s.title.toLowerCase().includes(query);
    const messageMatch = s.messages?.some(m =>
      (m.content && m.content.toLowerCase().includes(query)) ||
      (m.thinking_content && m.thinking_content.toLowerCase().includes(query))
    );
    return titleMatch || messageMatch;
  });

  const startRename = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      updateSessionTitle(id, editTitle);
    }
    setEditingId(null);
  };

  return (
    <>
      {/* 모바일 전용 배경 오버레이 */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        border-r flex flex-col justify-between transition-all duration-300 ease-in-out select-none
        ${darkMode ? 'bg-slate-900 border-slate-800/80 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}
        ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full md:translate-x-0'}
      `}>
        {/* ======================= 1. 사이드바가 펼쳐졌을 때 (Expanded - 사진 2 스타일) ======================= */}
        {isOpen ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* 상단 Header (서비스 타이틀 & 우측 아이콘 버튼들: 돋보기, 사이드바 닫기) */}
            <div className="p-3.5 flex items-center justify-between">
              <button
                onClick={() => { goHome(); navigate('/'); }}
                className="font-bold flex items-center gap-2 text-base hover:opacity-85 transition-opacity text-left cursor-pointer"
                title="홈 화면으로 이동"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">Diffusion Gemma</span>
              </button>

              {/* 우측 아이콘 버튼 그룹 (사진 2 우측 상단 스타일) */}
              <div className="flex items-center gap-1">
                {/* 검색 토글 버튼 */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showSearch
                      ? (darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-slate-200 text-indigo-600')
                      : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70')
                  }`}
                  title="검색"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* 사이드바 닫기 버튼 (사진 2 우측 상단 메인 버튼!) */}
                <button
                  onClick={onToggle}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    darkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="사이드바 닫기"
                >
                  <SidebarToggleIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 새 대화 시작 버튼 (사진 2 스타일) */}
            <div className="px-3 pb-2 space-y-2">
              <button
                onClick={() => { createSession(); navigate('/'); }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/50'
                    : 'bg-slate-200/70 hover:bg-slate-200 text-slate-800 border border-slate-300/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <SquarePen className="w-4 h-4 text-indigo-500" />
                  <span>새 채팅</span>
                </div>
                <Plus className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* 검색 창 (검색 버튼 클릭 시 토글 또는 항상 표시) */}
              {showSearch && (
                <div className="relative animate-fadeIn">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="대화 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-200 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 shadow-sm'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* 세션 목록 */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              <div className={`px-2 py-1 text-[10px] font-semibold tracking-wider uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                채팅
              </div>
              {filteredSessions.map(session => {
                const isSelected = session.id === currentSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => { selectSession(session.id); navigate(`/c/${session.id}`); }}
                    className={`
                      group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors
                      ${isSelected
                        ? (darkMode ? 'bg-slate-800 text-indigo-300 font-semibold' : 'bg-slate-200/80 text-indigo-700 font-semibold')
                        : (darkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900')}
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                      {editingId === session.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full px-2 py-0.5 rounded focus:outline-none text-xs ${
                            darkMode ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900 border border-slate-300'
                          }`}
                        />
                      ) : (
                        <span className="truncate">{session.title}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === session.id ? (
                        <button onClick={(e) => saveRename(session.id, e)} className="p-1 hover:text-indigo-400 cursor-pointer">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button onClick={(e) => startRename(session.id, session.title, e)} className={`p-1 ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900'} cursor-pointer`}>
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            if (currentSessionId === session.id) {
                              navigate('/');
                            }
                            await deleteSession(session.id);
                          }} className="p-1 hover:text-rose-400 cursor-pointer">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 유저 프로필 및 계정 팝업 카드 */}
            <div className={`p-3 border-t relative text-xs ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} ref={settingsRef}>
              {/* 관리자 패널 & 백엔드 상태 점검 (프로필 위쪽에 밖으로 배치) */}
              {user?.is_admin && (
                <div className="mb-2 space-y-1">
                  {onOpenAdmin && (
                    <button
                      onClick={() => onOpenAdmin()}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>관리자 패널</span>
                    </button>
                  )}

                  {onOpenStatus && (
                    <button
                      onClick={() => onOpenStatus()}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span>백엔드 상태 점검</span>
                    </button>
                  )}
                </div>
              )}

              {/* 이미지 스타일 계정/설정 팝업 카드 */}
              {isSettingsOpen && (
                <div className={`
                  absolute bottom-full mb-2 left-2 right-2 p-2 rounded-2xl shadow-2xl border z-50 space-y-1 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-150
                  ${darkMode 
                    ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/80' 
                    : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'}
                `}>
                  {/* 상단 프로필 영역 (이미지 맨 위 계정 영역과 동일) */}
                  {user && (
                    <button
                      onClick={() => {
                        if (onOpenProfile) onOpenProfile();
                        setIsSettingsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-pink-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase shadow-sm">
                          {user.username.slice(0, 2)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs truncate leading-tight">{user.username}</span>
                          <span className={`text-[10px] truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {user.email || 'Free'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </button>
                  )}

                  <div className={`my-1 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

                  {/* 메뉴 항목들 */}
                  {onOpenPassword && (
                    <button
                      onClick={() => {
                        onOpenPassword();
                        setIsSettingsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>비밀번호 변경</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      openCustomInstructionsModal();
                      setIsSettingsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span>맞춤 지침 설정</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleDarkMode();
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                    <span>테마 설정 ({darkMode ? '라이트 모드' : '다크 모드'})</span>
                  </button>

                  <div className={`my-1 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

                  <button
                    onClick={() => {
                      logout();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                </div>
              )}

              {/* 하단 메인 계정 프로필 카드 버튼 */}
              {user && (
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    isSettingsOpen
                      ? (darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-200/80 text-slate-900')
                      : (darkMode ? 'bg-slate-800/40 text-slate-300 hover:bg-slate-800/80' : 'bg-slate-200/50 text-slate-800 hover:bg-slate-200/90')
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-pink-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase shadow-sm">
                      {user.username.slice(0, 2)}
                    </div>
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="font-semibold truncate text-[11px] leading-tight">{user.username}</span>
                      <span className="text-[9px] text-slate-400 truncate leading-none mt-0.5">{user.email || 'Free'}</span>
                    </div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSettingsOpen ? '-rotate-90 text-indigo-400' : 'opacity-60'}`} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ======================= 2. 사이드바가 접혔을 때 (Collapsed - 사진 1 스타일 미니 세로바) ======================= */
          <div className="flex flex-col h-full justify-between items-center py-3.5 px-2">
            {/* 상단 미니 아이콘 목록 (사진 1 스타일) */}
            <div className="flex flex-col items-center gap-4">
              {/* 1. 사이드바 열기/펼치기 버튼 (사진 1 맨 위 아이콘 위치) */}
              <button
                onClick={onToggle}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="사이드바 열기"
              >
                <SidebarToggleIcon className="w-5 h-5" />
              </button>

              {/* 2. 새 채팅 버튼 (사진 1 2번째 연필 아이콘) */}
              <button
                onClick={() => { createSession(); navigate('/'); }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="새 채팅"
              >
                <SquarePen className="w-5 h-5" />
              </button>

              {/* 3. 검색 아이콘 (사진 1 3번째 돋보기 아이콘) */}
              <button
                onClick={onToggle}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="대화 검색"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* 4. 최근 대화 아이콘 (사진 1 4번째 말풍선 아이콘) */}
              <button
                onClick={onToggle}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="대화 목록"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>

            {/* 하단 유저 프로필 아바타 및 관리자 버튼 */}
            <div className="flex flex-col items-center gap-2">
              {user?.is_admin && (
                <>
                  {onOpenAdmin && (
                    <button
                      onClick={onOpenAdmin}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                      title="관리자 패널"
                    >
                      <Shield className="w-5 h-5 text-amber-500" />
                    </button>
                  )}
                  {onOpenStatus && (
                    <button
                      onClick={onOpenStatus}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                      title="백엔드 상태 점검"
                    >
                      <Activity className="w-5 h-5 text-indigo-400" />
                    </button>
                  )}
                </>
              )}

              {user && (
                <button
                  onClick={onToggle}
                  className="w-7 h-7 rounded-full bg-pink-400 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  title={user.username}
                >
                  {user.username.slice(0, 2)}
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;

