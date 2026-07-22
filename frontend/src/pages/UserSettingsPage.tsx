import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { ArrowLeft, Lock, User, Calendar, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserSettingsPageProps {
  onBack: () => void;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ onBack }) => {
  const { user, changePassword } = useAuthStore();
  const { darkMode } = useChatStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className={`min-h-screen w-screen flex flex-col font-sans transition-colors duration-200 ${
      darkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 상단 헤더 */}
      <header className={`h-14 border-b px-4 flex items-center gap-4 backdrop-blur-md transition-colors ${
        darkMode ? 'border-neutral-800/80 bg-neutral-900/50' : 'border-slate-300/80 bg-white/70 shadow-sm'
      }`}>
        <button
          onClick={onBack}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            darkMode
              ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
          title="돌아가기"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-sm">사용자 설정 및 프로필</h1>
      </header>

      {/* 본문 영역 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        
        {/* 알림 배너 */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 프로필 카드 */}
        <section className={`rounded-2xl border p-6 shadow-md transition-all ${
          darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <span>기본 프로필 정보</span>
          </h2>
          
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>사용자 ID</span>
              <span className="font-semibold">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>이메일 주소</span>
              <span className="font-semibold">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>가입일</span>
              <span className="font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
              </span>
            </div>
          </div>
        </section>

        {/* 비밀번호 변경 폼 */}
        <section className={`rounded-2xl border p-6 shadow-md transition-all ${
          darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            <span>비밀번호 변경</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 현재 비밀번호 */}
            <div className="space-y-1">
              <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                현재 비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="현재 비밀번호를 입력하세요"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div className="space-y-1">
              <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                새 비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="새 비밀번호를 입력하세요"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="space-y-1">
              <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                새 비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="새 비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>비밀번호 변경하기</span>
              )}
            </button>
          </form>
        </section>

      </main>
    </div>
  );
};

export default UserSettingsPage;
