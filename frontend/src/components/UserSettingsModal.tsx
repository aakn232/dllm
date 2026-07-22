import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { X, User, Calendar, KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword } = useAuthStore();
  const { darkMode } = useChatStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('모든 필드를 입력해 주세요.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('비밀번호가 성공적으로 업데이트되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          darkMode ? 'bg-neutral-900/95 border-neutral-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 모달 헤더 */}
        <div className={`p-4 px-6 border-b flex items-center justify-between ${
          darkMode ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">사용자 설정 및 프로필</h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                계정 프로필 정보를 확인하고 비밀번호를 변경할 수 있습니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors ${
              darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 알림 메시지 */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 기본 프로필 정보 */}
          <section className={`rounded-xl border p-4 transition-all ${
            darkMode ? 'bg-neutral-800/40 border-neutral-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wider text-indigo-400">
              기본 프로필 정보
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2 border-slate-700/20">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>사용자 ID</span>
                <span className="font-semibold">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2 border-slate-700/20">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>이메일 주소</span>
                <span className="font-semibold">{user?.email || '등록된 이메일 없음'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>가입일</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </span>
              </div>
            </div>
          </section>

          {/* 비밀번호 변경 */}
          <section className={`rounded-xl border p-4 transition-all ${
            darkMode ? 'bg-neutral-800/40 border-neutral-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>비밀번호 변경</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  현재 비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="현재 비밀번호를 입력하세요"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="새 비밀번호를 입력하세요"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  새 비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="새 비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>비밀번호 변경</span>
                )}
              </button>
            </form>
          </section>
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

export default UserSettingsModal;
