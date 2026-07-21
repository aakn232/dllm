import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Plus, MessageSquare, Trash2, Edit2, Check, Search, 
  Sun, Moon, X, Activity, Sliders, Shield, LogOut, User 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStatus: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenStatus, onOpenAdmin, onOpenProfile }) => {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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
      {/* 모바일 배경 오버레이 */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 border-r flex flex-col justify-between transition-all duration-300
        ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 상단 Header & 새 대화 버튼 */}
        <div className={`p-4 space-y-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-300'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { goHome(); onClose(); }}
              className="font-bold flex items-center gap-2 text-base hover:opacity-85 transition-opacity text-left cursor-pointer"
              title="홈 화면으로 이동"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Diffusion Gemma</span>
            </button>
            <button onClick={onClose} className={`md:hidden ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => { createSession(); onClose(); }}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>새 대화 시작</span>
          </button>

          {/* 세션 검색 */}
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="대화 내용 또는 제목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                darkMode
                  ? 'bg-slate-800 border-slate-700/60 text-slate-200 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 shadow-sm'
              }`}
            />
          </div>
        </div>

        {/* 대화 세션 목록 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSessions.map(session => {
            const isSelected = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                onClick={() => { selectSession(session.id); onClose(); }}
                className={`
                  group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors
                  ${isSelected
                    ? (darkMode ? 'bg-slate-800 text-indigo-300 font-semibold border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-300')
                    : (darkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900')}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
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

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId === session.id ? (
                    <button onClick={(e) => saveRename(session.id, e)} className="p-1 hover:text-indigo-400 cursor-pointer">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button onClick={(e) => startRename(session.id, session.title, e)} className={`p-1 ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900'} cursor-pointer`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="p-1 hover:text-rose-400 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 설정 (유저 프로필 & 맞춤 지침 & 테마 토글 & 서버 상태 확인 버튼) */}
        <div className={`p-3 border-t flex flex-col gap-1.5 text-xs ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'}`}>
          {/* 유저 프로필 카드 */}
          {user && (
            <div className={`flex items-center justify-between p-2 rounded-xl mb-1 ${
              darkMode ? 'bg-slate-800/40 text-slate-300' : 'bg-slate-200/50 text-slate-850'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-650 flex items-center justify-center text-white font-bold uppercase flex-shrink-0 text-[10px]">
                  {user.username[0]}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold truncate text-[10.5px] leading-tight">{user.username}</span>
                  <span className="text-[8.5px] text-slate-500 truncate leading-none mt-0.5">{user.email}</span>
                </div>
              </div>
              
              <button 
                onClick={logout}
                className="p-1 hover:text-rose-400 transition-colors flex-shrink-0 cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 관리자 패널 메뉴 */}
          {user?.is_admin && onOpenAdmin && (
            <button
              onClick={() => { onOpenAdmin(); onClose(); }}
              className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>관리자 패널</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">Admin</span>
            </button>
          )}

          {onOpenProfile && (
            <button
              onClick={() => { onOpenProfile(); onClose(); }}
              className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <span>사용자 설정</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">Profile</span>
            </button>
          )}

          <button
            onClick={() => { openCustomInstructionsModal(); onClose(); }}
            className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>맞춤 지침 설정</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">Custom</span>
          </button>

          {user?.is_admin && (
            <button
              onClick={onOpenStatus}
              className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>백엔드 상태 점검</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleDarkMode}
              className={`flex items-center gap-2 transition-colors cursor-pointer ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900'}`}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>{darkMode ? '라이트 모드' : '다크 모드'}</span>
            </button>

            <span className={`text-[9px] ${darkMode ? 'text-slate-655' : 'text-slate-455'}`}>NIM 26B A4B</span>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
