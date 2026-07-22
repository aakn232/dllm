import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { X, User, Calendar, ShieldCheck } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { darkMode } = useChatStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all ${
          darkMode ? 'bg-neutral-900/95 border-neutral-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 모달 헤더 */}
        <div className={`p-4 px-6 border-b flex items-center justify-between ${
          darkMode ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-400 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 uppercase shadow-sm">
              {user?.username.slice(0, 2) || 'US'}
            </div>
            <div>
              <h2 className="text-base font-bold">{user?.username}님의 프로필</h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.email || 'Free 사용자'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 (기본 프로필 정보만 표시) */}
        <div className="p-6 space-y-4">
          <div className={`rounded-xl border p-4 transition-all ${
            darkMode ? 'bg-neutral-800/40 border-neutral-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>기본 계정 정보</span>
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/20">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>사용자 ID</span>
                <span className="font-semibold text-sm">{user?.username}</span>
              </div>

              <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/20">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>이메일 주소</span>
                <span className="font-semibold">{user?.email || '등록된 이메일 없음'}</span>
              </div>

              <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/20">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>계정 권한</span>
                <span className="font-semibold flex items-center gap-1 text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user?.is_admin ? '관리자 계정' : '일반 사용자'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>가입일</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className={`p-4 px-6 border-t flex items-center justify-end ${
          darkMode ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
