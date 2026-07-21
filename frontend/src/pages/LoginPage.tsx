import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { Lock, User, Mail, Sparkles, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 아이디 중복 확인 관련 상태
  const [checkedUsername, setCheckedUsername] = useState('');
  const [idCheckStatus, setIdCheckStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [idCheckMessage, setIdCheckMessage] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { login, register, checkUsernameAvailability } = useAuthStore();
  const { darkMode } = useChatStore();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // 아이디가 수정되면 중복 확인 상태 리셋
    if (idCheckStatus !== 'idle') {
      setIdCheckStatus('idle');
      setIdCheckMessage('');
      setCheckedUsername('');
    }
  };

  const handleCheckDuplicate = async () => {
    setErrorMsg('');
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg('아이디를 입력해주세요.');
      return;
    }
    if (trimmedUsername.length < 2) {
      setErrorMsg('아이디는 최소 2자 이상이어야 합니다.');
      return;
    }

    setIdCheckStatus('checking');
    setIdCheckMessage('');

    try {
      const res = await checkUsernameAvailability(trimmedUsername);
      if (res.is_available) {
        setIdCheckStatus('available');
        setIdCheckMessage(res.message || '사용 가능한 아이디입니다.');
        setCheckedUsername(trimmedUsername);
      } else {
        setIdCheckStatus('unavailable');
        setIdCheckMessage(res.message || '이미 사용 중인 아이디입니다.');
        setCheckedUsername('');
      }
    } catch (err: any) {
      setIdCheckStatus('unavailable');
      setIdCheckMessage(err.message || '중복 확인 중 오류가 발생했습니다.');
      setCheckedUsername('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (!username.trim() || !password) {
      setErrorMsg('필수 입력 항목을 모두 입력해주세요.');
      setIsSubmitting(false);
      return;
    }

    if (!isLoginTab) {
      if (!email.trim()) {
        setErrorMsg('이메일 주소를 입력해주세요.');
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('비밀번호가 일치하지 않습니다.');
        setIsSubmitting(false);
        return;
      }
      // 아이디 중복 검사 확인
      if (idCheckStatus !== 'available' || checkedUsername !== username.trim()) {
        setErrorMsg('아이디 중복확인을 완료해주세요.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (isLoginTab) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
      if (isLoginTab) {
        setPassword('');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 0);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormState = () => {
    setErrorMsg('');
    setIdCheckStatus('idle');
    setIdCheckMessage('');
    setCheckedUsername('');
  };

  return (
    <div className={`min-h-screen w-screen flex flex-col items-center justify-center font-sans transition-colors duration-200 px-4 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none -z-10" />
      
      <div className="w-full max-w-md relative z-10">
        {/* 서비스 타이틀 */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-3 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Diffusion Gemma AI
          </h2>
          <p className={`text-xs mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            개인 맞춤화된 지능형 대화 플랫폼
          </p>
        </div>

        {/* 폼 카드 컨테이너 */}
        <div className={`rounded-2xl border p-6 shadow-2xl backdrop-blur-md transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/50' : 'bg-white border-slate-200 shadow-slate-200'
        }`}>
          {/* 탭 버튼 */}
          <div className="flex rounded-xl p-1 mb-6 bg-slate-800/40 border border-slate-700/30">
            <button
              onClick={() => { setIsLoginTab(true); resetFormState(); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isLoginTab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setIsLoginTab(false); resetFormState(); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                !isLoginTab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 에러 피드백 */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 폼 본문 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 사용자명 */}
            <div className="space-y-1">
              <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                사용자 ID (Username)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="ID를 입력하세요"
                    value={username}
                    onChange={handleUsernameChange}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                {!isLoginTab && (
                  <button
                    type="button"
                    onClick={handleCheckDuplicate}
                    disabled={idCheckStatus === 'checking' || !username.trim()}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 cursor-pointer disabled:opacity-50 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-750'
                        : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200 shadow-sm'
                    }`}
                  >
                    {idCheckStatus === 'checking' ? '확인 중...' : '중복확인'}
                  </button>
                )}
              </div>
              {/* 중복 확인 피드백 메시지 */}
              {!isLoginTab && idCheckMessage && (
                <div className={`flex items-center gap-1.5 text-[11px] mt-1.5 font-medium ${
                  idCheckStatus === 'available' ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {idCheckStatus === 'available' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{idCheckMessage}</span>
                </div>
              )}
            </div>

            {/* 회원가입 시 이메일 */}
            {!isLoginTab && (
              <div className="space-y-1">
                <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  이메일 주소
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* 비밀번호 */}
            <div className="space-y-1">
              <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700/60 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* 회원가입 시 비밀번호 확인 */}
            {!isLoginTab && (
              <div className="space-y-1">
                <label className={`text-[11px] font-semibold tracking-wide uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="비밀번호를 한번 더 입력하세요"
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
            )}

            {/* 전송 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isLoginTab ? '로그인' : '회원가입'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
