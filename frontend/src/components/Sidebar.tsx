import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Plus, MessageSquare, Trash2, Edit2, Check, Search, Sun, Moon, X, Activity, Sliders } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStatus: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenStatus }) => {
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
              className="font-bold flex items-center gap-2 text-base hover:opacity-80 transition-opacity text-left cursor-pointer"
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
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
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
                    <button onClick={(e) => saveRename(session.id, e)} className="p-1 hover:text-indigo-400">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button onClick={(e) => startRename(session.id, session.title, e)} className={`p-1 ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900'}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="p-1 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 설정 (맞춤 지침 & 테마 토글 & 서버 상태 확인 버튼) */}
        <div className={`p-3 border-t flex flex-col gap-1.5 text-xs ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'}`}>
          <button
            onClick={() => { openCustomInstructionsModal(); onClose(); }}
            className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors ${
              darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>맞춤 지침 설정</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">Custom</span>
          </button>

          <button
            onClick={onOpenStatus}
            className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors ${
              darkMode ? 'hover:bg-slate-800 hover:text-slate-100' : 'hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>백엔드 상태 점검</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleDarkMode}
              className={`flex items-center gap-2 transition-colors ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900'}`}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>{darkMode ? '라이트 모드' : '다크 모드'}</span>
            </button>

            <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>NIM 26B A4B</span>
          </div>
        </div>
      </aside>
    </>
  );
};

