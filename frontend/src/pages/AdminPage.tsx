import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { authFetch } from '../utils/apiClient';
import { 
  ShieldAlert, CheckCircle, XCircle, Settings, UserX, 
  UserCheck, RefreshCw, Sliders, X, ArrowLeft 
} from 'lucide-react';

interface UserAdminView {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  today_token_count: number;
  today_request_count: number;
  limit_mode: string;
  daily_token_limit: number | null;
  daily_request_limit: number | null;
  remaining_tokens: number | null;
}

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserAdminView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // 한도 설정 모달 상태
  const [selectedUser, setSelectedUser] = useState<UserAdminView | null>(null);
  const [limitMode, setLimitMode] = useState('both');
  const [tokenLimit, setTokenLimit] = useState<string>('');
  const [requestLimit, setRequestLimit] = useState<string>('');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  const { darkMode } = useChatStore();
  const { user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch('http://localhost:8000/api/v1/admin/users');
      if (!res.ok) {
        throw new Error('사용자 목록을 불러오지 못했습니다.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // 30초마다 자동 갱신
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/admin/users/${userId}/activate`, {
        method: 'PUT',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: '활성화 상태 변경 실패' }));
        throw new Error(errData.detail || '상태 변경 중 오류가 발생했습니다.');
      }
      
      // 로컬 리스트 업데이트
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return { ...u, is_active: !u.is_active };
        }
        return u;
      }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenLimitModal = (user: UserAdminView) => {
    setSelectedUser(user);
    setLimitMode(user.limit_mode);
    setTokenLimit(user.daily_token_limit !== null ? String(user.daily_token_limit) : '');
    setRequestLimit(user.daily_request_limit !== null ? String(user.daily_request_limit) : '');
  };

  const handleSaveLimit = async () => {
    if (!selectedUser) return;
    setIsSavingLimit(true);
    
    const payload = {
      limit_mode: limitMode,
      daily_token_limit: limitMode !== 'request_only' && tokenLimit !== '' ? parseInt(tokenLimit, 10) : null,
      daily_request_limit: limitMode !== 'token_only' && requestLimit !== '' ? parseInt(requestLimit, 10) : null,
    };

    try {
      const res = await authFetch(`http://localhost:8000/api/v1/admin/users/${selectedUser.id}/limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('한도 설정 저장에 실패했습니다.');
      }

      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingLimit(false);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 어드민 헤더 */}
      <header className={`h-14 border-b px-6 flex items-center justify-between backdrop-blur-md transition-colors ${
        darkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-300/80 bg-white/70 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg border transition-colors ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>관리자 패널 — 사용자 한도 및 상태 제어</span>
          </h2>
        </div>

        <button
          onClick={fetchUsers}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
          }`}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </button>
      </header>

      {/* 어드민 본문 */}
      <div className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        {errorMsg && (
          <div className="p-4 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-950/40' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'} text-[11px] font-semibold uppercase tracking-wider text-slate-400`}>
                  <th className="p-4">사용자명</th>
                  <th className="p-4">이메일</th>
                  <th className="p-4 text-center">권한</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-right">오늘 사용량</th>
                  <th className="p-4">한도 설정</th>
                  <th className="p-4 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map(u => (
                  <tr 
                    key={u.id} 
                    className={`transition-colors ${
                      darkMode ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
                          {u.username[0]}
                        </div>
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.is_admin 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center">
                        {u.is_active ? (
                          <span title="활성화됨"><CheckCircle className="w-4 h-4 text-emerald-500" /></span>
                        ) : (
                          <span title="비활성화됨"><XCircle className="w-4 h-4 text-rose-500" /></span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-y-0.5">
                      <div className="font-mono text-slate-300">
                        {u.today_request_count}회 요청
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ({u.today_token_count.toLocaleString()} 토큰)
                      </div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded">
                          {u.limit_mode === 'both' ? '둘 다 적용' : (u.limit_mode === 'token_only' ? '토큰 제한' : '요청수 제한')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {u.limit_mode !== 'token_only' && (
                          <div>일일 요청 한도: {u.daily_request_limit !== null ? `${u.daily_request_limit}회` : '무제한'}</div>
                        )}
                        {u.limit_mode !== 'request_only' && (
                          <div>일일 토큰 한도: {u.daily_token_limit !== null ? `${u.daily_token_limit.toLocaleString()}T` : '무제한'}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* 한도 변경 버튼 */}
                        <button
                          onClick={() => handleOpenLimitModal(u)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
                          }`}
                          title="사용자 일일 한도 설정"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* 활성/비활성 토글 */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              u.is_active 
                                ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-rose-400' 
                                : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                            title={u.is_active ? '사용자 비활성화' : '사용자 활성화'}
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 한도 편집 모달 오버레이 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-800/40">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>[{selectedUser.username}] 한도 설정</span>
              </h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className={`p-1 rounded hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 한도 모드 라디오 버튼 */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-400">제한 기준 모드</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'both', label: '둘 다 제한' },
                    { value: 'token_only', label: '토큰만 제한' },
                    { value: 'request_only', label: '요청만 제한' }
                  ].map(tab => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setLimitMode(tab.value)}
                      className={`py-2 text-[10px] font-semibold border rounded-lg transition-colors cursor-pointer ${
                        limitMode === tab.value
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : (darkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200')
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 일일 토큰 한도 */}
              {limitMode !== 'request_only' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">일일 토큰 한도 (숫자만 입력, 빈값 시 무제한)</label>
                  <input
                    type="number"
                    placeholder="예: 100000"
                    value={tokenLimit}
                    onChange={(e) => setTokenLimit(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              {/* 일일 요청 한도 */}
              {limitMode !== 'token_only' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">일일 요청 횟수 한도 (숫자만 입력, 빈값 시 무제한)</label>
                  <input
                    type="number"
                    placeholder="예: 30"
                    value={requestLimit}
                    onChange={(e) => setRequestLimit(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className={`px-4 py-2 rounded-lg border text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveLimit}
                disabled={isSavingLimit}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingLimit ? '저장 중...' : '한도 적용'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPage;
