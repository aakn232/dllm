import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { authFetch } from '../utils/apiClient';
import { API_V1_BASE } from '../config';
import { 
  ShieldAlert, CheckCircle, XCircle, Settings, UserX, 
  UserCheck, RefreshCw, X, ArrowLeft,
  MessageSquare, Key, FileText,
  User, Lock, Cpu, Check, Copy, Gauge, Trash2, Edit3, Save
} from 'lucide-react';
import { ThinkingBlock } from '../components/ThinkingBlock';

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

interface SystemSettingsData {
  id: number;
  max_tokens: number;
  updated_at: string;
}

interface UserSettingsData {
  dark_mode: boolean;
  enable_thinking: boolean;
  temperature: number;
  top_p: number;
  language: string;
  updated_at: string;
}

interface CustomInstructionData {
  user_profile: string;
  response_style: string;
  is_enabled: boolean;
  updated_at: string;
}

interface UserAdminDetailView extends UserAdminView {
  updated_at: string;
  hashed_password: string;
  settings: UserSettingsData | null;
  custom_instruction: CustomInstructionData | null;
}

interface AdminChatSessionView {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface AdminChatMessageView {
  id: string;
  session_id: string;
  role: string;
  content: string;
  thinking_content?: string | null;
  reasoning_content?: string | null;
  raw_response?: string | null;
  thinking_type?: 'Reasoning' | 'Thinking' | null;
  created_at: string;
  attachments: any[];
}

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserAdminView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [activeModal, setActiveModal] = useState<'none' | 'conversations' | 'details' | 'password' | 'delete'>('none');
  const [targetUser, setTargetUser] = useState<UserAdminView | null>(null);

  // 대화 내역 모달
  const [sessions, setSessions] = useState<AdminChatSessionView[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<AdminChatMessageView[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  // 유저 상세 모달
  const [userDetail, setUserDetail] = useState<UserAdminDetailView | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // 비밀번호 재설정
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // 한도 설정
  const [limitMode, setLimitMode] = useState('both');
  const [tokenLimit, setTokenLimit] = useState<string>('');
  const [requestLimit, setRequestLimit] = useState<string>('');
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitSaveMsg, setLimitSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 시스템 전역 설정
  const [systemSettings, setSystemSettings] = useState<SystemSettingsData | null>(null);
  const [maxTokensInput, setMaxTokensInput] = useState<string>('8192');
  const [isSystemSettingsLoading, setIsSystemSettingsLoading] = useState(false);
  const [isSavingSystemSettings, setIsSavingSystemSettings] = useState(false);
  const [systemSettingsMsg, setSystemSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 사용자 삭제
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // ─── AI 모델 파라미터 편집 상태 ───
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editTemperature, setEditTemperature] = useState<string>('0.7');
  const [editTopP, setEditTopP] = useState<string>('0.9');
  const [editDarkMode, setEditDarkMode] = useState<boolean>(true);
  const [editEnableThinking, setEditEnableThinking] = useState<boolean>(false);
  const [editLanguage, setEditLanguage] = useState<string>('ko');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── 커스텀 지침 편집 상태 ───
  const [isEditingInstruction, setIsEditingInstruction] = useState(false);
  const [editUserProfile, setEditUserProfile] = useState<string>('');
  const [editResponseStyle, setEditResponseStyle] = useState<string>('');
  const [editIsEnabled, setEditIsEnabled] = useState<boolean>(true);
  const [isSavingInstruction, setIsSavingInstruction] = useState(false);
  const [instructionSaveMsg, setInstructionSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { darkMode } = useChatStore();
  const { user: currentUser } = useAuthStore();

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users`);
      if (!res.ok) throw new Error('사용자 목록을 불러오지 못했습니다.');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    setIsSystemSettingsLoading(true);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/system-settings`);
      if (res.ok) {
        const data: SystemSettingsData = await res.json();
        setSystemSettings(data);
        setMaxTokensInput(data.max_tokens.toString());
      }
    } catch (err) {
      console.error('시스템 설정 조회 실패:', err);
    } finally {
      setIsSystemSettingsLoading(false);
    }
  };

  const evaluateMathExpression = (expr: string): number | null => {
    try {
      const sanitized = expr.trim();
      if (!sanitized) return null;
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;
      const evalResult = Function(`"use strict"; return (${sanitized})`)();
      if (typeof evalResult === 'number' && !isNaN(evalResult) && isFinite(evalResult) && evalResult > 0) {
        return Math.floor(evalResult);
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedTokens = evaluateMathExpression(maxTokensInput);
    if (calculatedTokens === null || calculatedTokens < 1) {
      setSystemSettingsMsg({ type: 'error', text: '올바른 수식이나 정수(1 이상)를 입력해주세요. (예: 8192*2, 4096+2048)' });
      return;
    }
    setIsSavingSystemSettings(true);
    setSystemSettingsMsg(null);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/system-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_tokens: calculatedTokens }),
      });
      if (!res.ok) throw new Error('전역 설정 저장 실패');
      const updated: SystemSettingsData = await res.json();
      setSystemSettings(updated);
      setMaxTokensInput(updated.max_tokens.toString());
      setSystemSettingsMsg({ type: 'success', text: `시스템 전역 설정이 성공적으로 저장되었습니다. (${calculatedTokens.toLocaleString()} tokens)` });
    } catch (err: any) {
      setSystemSettingsMsg({ type: 'error', text: err.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSavingSystemSettings(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSystemSettings();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${userId}/activate`, { method: 'PUT' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: '활성화 상태 변경 실패' }));
        throw new Error(errData.detail || '상태 변경 중 오류가 발생했습니다.');
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenConversationsModal = async (user: UserAdminView) => {
    setTargetUser(user);
    setActiveModal('conversations');
    setSessions([]);
    setSelectedSessionId(null);
    setSessionMessages([]);
    setIsSessionsLoading(true);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${user.id}/sessions`);
      if (!res.ok) throw new Error('대화 세션 목록을 가져올 수 없습니다.');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0) handleSelectSession(user.id, data[0].id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const handleSelectSession = async (userId: string, sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsMessagesLoading(true);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${userId}/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error('대화 메시지를 가져올 수 없습니다.');
      const data = await res.json();
      setSessionMessages(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const handleOpenDetailsModal = async (user: UserAdminView) => {
    setTargetUser(user);
    setActiveModal('details');
    setUserDetail(null);
    setIsDetailLoading(true);
    setCopiedHash(false);
    setLimitSaveMsg(null);
    setIsEditingSettings(false);
    setIsEditingInstruction(false);
    setSettingsSaveMsg(null);
    setInstructionSaveMsg(null);
    setLimitMode(user.limit_mode);
    setTokenLimit(user.daily_token_limit !== null ? String(user.daily_token_limit) : '');
    setRequestLimit(user.daily_request_limit !== null ? String(user.daily_request_limit) : '');
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${user.id}/details`);
      if (!res.ok) throw new Error('사용자 상세 정보를 가져올 수 없습니다.');
      const data = await res.json();
      setUserDetail(data);
      // 편집 폼 초기값 세팅
      if (data.settings) {
        setEditTemperature(String(data.settings.temperature));
        setEditTopP(String(data.settings.top_p));
        setEditDarkMode(data.settings.dark_mode);
        setEditEnableThinking(data.settings.enable_thinking);
        setEditLanguage(data.settings.language);
      }
      if (data.custom_instruction) {
        setEditUserProfile(data.custom_instruction.user_profile || '');
        setEditResponseStyle(data.custom_instruction.response_style || '');
        setEditIsEnabled(data.custom_instruction.is_enabled);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenPasswordModal = (user: UserAdminView) => {
    setTargetUser(user);
    setActiveModal('password');
    setNewPassword('');
    setUserDetail(null);
    authFetch(`${API_V1_BASE}/admin/users/${user.id}/details`)
      .then(res => res.json())
      .then(data => setUserDetail(data))
      .catch(() => {});
  };

  const handleResetPassword = async () => {
    if (!targetUser) return;
    if (!newPassword || newPassword.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${targetUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (!res.ok) throw new Error('비밀번호 변경에 실패했습니다.');
      const data = await res.json();
      alert(data.message || '비밀번호가 변경되었습니다.');
      setActiveModal('none');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSaveLimit = async () => {
    if (!targetUser) return;
    setIsSavingLimit(true);
    setLimitSaveMsg(null);
    const payload = {
      limit_mode: limitMode,
      daily_token_limit: limitMode !== 'request_only' && tokenLimit !== '' ? parseInt(tokenLimit, 10) : null,
      daily_request_limit: limitMode !== 'token_only' && requestLimit !== '' ? parseInt(requestLimit, 10) : null,
    };
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${targetUser.id}/limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('한도 설정 저장에 실패했습니다.');
      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
      setTargetUser(updatedUser);
      setLimitSaveMsg({ type: 'success', text: '일일 한도가 성공적으로 저장되었습니다.' });
    } catch (err: any) {
      setLimitSaveMsg({ type: 'error', text: err.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSavingLimit(false);
    }
  };

  // ─── AI 모델 파라미터 저장 ───
  const handleSaveUserSettings = async () => {
    if (!targetUser) return;
    const tempVal = parseFloat(editTemperature);
    const topPVal = parseFloat(editTopP);
    if (isNaN(tempVal) || tempVal < 0 || tempVal > 2) {
      setSettingsSaveMsg({ type: 'error', text: 'Temperature는 0~2 범위의 숫자여야 합니다.' });
      return;
    }
    if (isNaN(topPVal) || topPVal < 0 || topPVal > 1) {
      setSettingsSaveMsg({ type: 'error', text: 'Top P는 0~1 범위의 숫자여야 합니다.' });
      return;
    }
    setIsSavingSettings(true);
    setSettingsSaveMsg(null);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${targetUser.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dark_mode: editDarkMode,
          enable_thinking: editEnableThinking,
          temperature: tempVal,
          top_p: topPVal,
          language: editLanguage,
        }),
      });
      if (!res.ok) throw new Error('AI 설정 저장 실패');
      const updated = await res.json();
      setUserDetail(prev => prev ? { ...prev, settings: updated } : prev);
      setIsEditingSettings(false);
      setSettingsSaveMsg({ type: 'success', text: 'AI 모델 파라미터가 성공적으로 저장되었습니다.' });
    } catch (err: any) {
      setSettingsSaveMsg({ type: 'error', text: err.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ─── 커스텀 지침 저장 ───
  const handleSaveInstruction = async () => {
    if (!targetUser) return;
    if (editUserProfile.length > 2000 || editResponseStyle.length > 2000) {
      setInstructionSaveMsg({ type: 'error', text: '각 필드는 최대 2000자까지 입력 가능합니다.' });
      return;
    }
    setIsSavingInstruction(true);
    setInstructionSaveMsg(null);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${targetUser.id}/custom-instructions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_profile: editUserProfile,
          response_style: editResponseStyle,
          is_enabled: editIsEnabled,
        }),
      });
      if (!res.ok) throw new Error('커스텀 지침 저장 실패');
      const updated = await res.json();
      setUserDetail(prev => prev ? { ...prev, custom_instruction: updated } : prev);
      setIsEditingInstruction(false);
      setInstructionSaveMsg({ type: 'success', text: '커스텀 지침 프로필이 성공적으로 저장되었습니다.' });
    } catch (err: any) {
      setInstructionSaveMsg({ type: 'error', text: err.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSavingInstruction(false);
    }
  };

  const handleOpenDeleteModal = (user: UserAdminView) => {
    setTargetUser(user);
    setActiveModal('delete');
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    setIsDeletingUser(true);
    try {
      const res = await authFetch(`${API_V1_BASE}/admin/users/${targetUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: '사용자 삭제에 실패했습니다.' }));
        throw new Error(errData.detail || '사용자 삭제 중 오류가 발생했습니다.');
      }
      const data = await res.json();
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      setActiveModal('none');
      alert(data.message || '사용자가 삭제되었습니다.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // 공통 인풋 스타일
  const inputCls = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 transition-colors ${
    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
  }`;
  const textareaCls = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-none ${
    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
  }`;

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      darkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 어드민 헤더 */}
      <header className={`h-14 border-b px-6 flex items-center justify-between backdrop-blur-md transition-colors ${
        darkMode ? 'border-neutral-800/80 bg-neutral-900/50' : 'border-slate-300/80 bg-white/70 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg border transition-colors ${
              darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>관리자 대시보드 — 유저 데이터 / 대화 / 설정 / 보안 대시보드</span>
          </h2>
        </div>
        <button
          onClick={fetchUsers}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            darkMode ? 'bg-neutral-800 border-neutral-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm'
          }`}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </button>
      </header>

      {/* 어드민 본문 */}
      <div className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        {/* 시스템 전역 설정 카드 */}
        <div className={`mb-6 p-5 rounded-2xl border ${
          darkMode ? 'bg-neutral-900 border-neutral-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold">시스템 전역 설정 (System Settings)</h3>
            </div>
            {systemSettings && (
              <span className="text-[11px] text-slate-500 font-mono">
                최종 수정: {new Date(systemSettings.updated_at).toLocaleString()}
              </span>
            )}
          </div>
          <form onSubmit={handleSaveSystemSettings} className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <label className="text-xs text-slate-400 font-medium">최대 출력 토큰 수 (max_tokens):</label>
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={maxTokensInput}
                  onChange={(e) => setMaxTokensInput(e.target.value)}
                  className={`w-44 px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none transition-colors ${
                    darkMode ? 'bg-neutral-800 border-neutral-700 text-emerald-400 focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="예: 8192*2 또는 16384"
                  disabled={isSystemSettingsLoading || isSavingSystemSettings}
                />
                {(() => {
                  const evalVal = evaluateMathExpression(maxTokensInput);
                  if (evalVal !== null && maxTokensInput.match(/[+\-*/]/)) {
                    return (
                      <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        = {evalVal.toLocaleString()}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <span className="text-[11px] text-slate-500">사칙연산(예: 8192*2, 4096+2048) 입력이 가능합니다.</span>
            </div>
            <button
              type="submit"
              disabled={isSystemSettingsLoading || isSavingSystemSettings}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSavingSystemSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>설정 저장</span>
            </button>
          </form>
          {systemSettingsMsg && (
            <div className={`mt-3 text-xs flex items-center gap-1.5 ${
              systemSettingsMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {systemSettingsMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{systemSettingsMsg.text}</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'bg-neutral-900 border-neutral-800 shadow-2xl shadow-slate-950/40' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-neutral-800 bg-neutral-900' : 'border-slate-200 bg-slate-100'} text-[11px] font-semibold uppercase tracking-wider text-slate-400`}>
                  <th className="p-4">사용자명</th>
                  <th className="p-4">이메일</th>
                  <th className="p-4 text-center">권한</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-right">오늘 사용량</th>
                  <th className="p-4">한도 설정</th>
                  <th className="p-4 text-center">유저 데이터 / 관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map(u => (
                  <tr
                    key={u.id}
                    className={`transition-colors ${darkMode ? 'hover:bg-neutral-800/20' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
                          {u.username[0]}
                        </div>
                        <span className="text-sm">{u.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">{u.email}</td>
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
                      <div className="font-mono text-slate-300 font-semibold">{u.today_request_count}회 요청</div>
                      <div className="text-[10px] text-slate-500 font-mono">({u.today_token_count.toLocaleString()} 토큰)</div>
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenConversationsModal(u)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                            darkMode ? 'bg-indigo-950/40 border-indigo-800/60 hover:bg-indigo-900/60 text-indigo-300' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700 shadow-sm'
                          }`}
                          title="대화 내역 확인"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>대화 내역</span>
                        </button>
                        <button
                          onClick={() => handleOpenDetailsModal(u)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                            darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 shadow-sm'
                          }`}
                          title="설정값 & 프로필 데이터 확인 및 편집"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>설정값</span>
                        </button>
                        <button
                          onClick={() => handleOpenPasswordModal(u)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                            darkMode ? 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/60 text-amber-300' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700 shadow-sm'
                          }`}
                          title="비밀번호 확인 및 재설정"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>비밀번호</span>
                        </button>
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
                        {u.id !== currentUser?.id && !u.is_admin && (
                          <button
                            onClick={() => handleOpenDeleteModal(u)}
                            className="p-1.5 rounded-lg border transition-colors cursor-pointer bg-red-600/10 border-red-600/30 hover:bg-red-600/25 text-red-400"
                            title="사용자 계정 영구 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ===================== 1. 대화 내역 모달 ===================== */}
      {activeModal === 'conversations' && targetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setActiveModal('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-5xl h-[85vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
              darkMode ? 'bg-neutral-900 border-neutral-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">[{targetUser.username}] 유저 대화 히스토리 및 메시지 내역</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className={`w-80 border-r flex flex-col overflow-y-auto ${darkMode ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'}`}>
                <div className="p-3 border-b border-slate-800/20 text-xs font-semibold text-slate-400 flex justify-between items-center">
                  <span>대화 세션 ({sessions.length}개)</span>
                </div>
                {isSessionsLoading ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> 세션 불러오는 중...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">주고받은 대화가 존재하지 않습니다.</div>
                ) : (
                  <div className="divide-y divide-slate-800/20">
                    {sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectSession(targetUser.id, s.id)}
                        className={`w-full text-left p-3.5 transition-colors text-xs cursor-pointer flex flex-col gap-1 ${
                          selectedSessionId === s.id
                            ? (darkMode ? 'bg-indigo-600/20 border-l-4 border-indigo-500 text-indigo-200 font-semibold' : 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-900 font-semibold')
                            : (darkMode ? 'hover:bg-neutral-800/40 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                        }`}
                      >
                        <div className="font-medium truncate">{s.title || '제목 없음'}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>메시지 {s.message_count}개</span>
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden bg-opacity-30">
                {selectedSessionId ? (
                  isMessagesLoading ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> 메시지 내역 불러오는 중...
                    </div>
                  ) : sessionMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500">선택된 세션에 메시지가 없습니다.</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {sessionMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] rounded-2xl p-4 text-xs shadow-sm ${
                            msg.role === 'user'
                              ? 'ml-auto bg-indigo-600 text-white rounded-br-none'
                              : (darkMode ? 'bg-neutral-800 border border-neutral-700/80 text-slate-100 rounded-bl-none' : 'bg-slate-100 border border-slate-200 text-slate-900 rounded-bl-none')
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/10 text-[10px] opacity-75">
                            <span className="font-bold uppercase tracking-wider">{msg.role === 'user' ? '👤 USER' : '🤖 ASSISTANT (AI)'}</span>
                            <div className="flex items-center gap-2">
                              {msg.role !== 'user' && (msg as any).tps !== undefined && (msg as any).tps > 0 && (
                                <div className="px-2 py-0.5 rounded-full border bg-black/20 border-white/10 text-indigo-300 flex items-center gap-1 font-mono text-[10px]">
                                  <Gauge className="w-3 h-3 text-indigo-400" />
                                  <span>{(msg as any).tps} t/s</span>
                                </div>
                              )}
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                          {msg.role !== 'user' && (msg.reasoning_content || msg.thinking_content) && (
                            <ThinkingBlock
                              reasoningContent={msg.reasoning_content}
                              thinkingContent={msg.thinking_content}
                              thinkingType={msg.thinking_type}
                              isStreaming={false}
                              hasAssistantContent={!!msg.content && msg.content.trim().length > 0}
                            />
                          )}
                          <div className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                    좌측 대화 목록에서 확인하실 세션을 선택해주세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 2. 유저 상세 셋팅 & 프로필 + 일일한도설정 통합 모달 ===================== */}
      {activeModal === 'details' && targetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setActiveModal('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
              darkMode ? 'bg-neutral-900 border-neutral-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">[{targetUser.username}] 유저 설정 및 프로필 상세 정보</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {isDetailLoading ? (
                <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> 유저 데이터를 불러오는 중...
                </div>
              ) : userDetail ? (
                <>
                  {/* 기본 계정 정보 */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> 계정 및 보안 데이터
                    </h4>
                    <div className={`p-4 rounded-xl border grid grid-cols-2 gap-3 font-mono ${
                      darkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className="text-slate-500 block text-[10px]">ID / UUID</span>
                        <span className="text-slate-200 font-semibold">{userDetail.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">이메일 주소</span>
                        <span className="text-slate-200 font-semibold">{userDetail.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">계정 가입일</span>
                        <span className="text-slate-300">{new Date(userDetail.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">최종 업데이트</span>
                        <span className="text-slate-300">{new Date(userDetail.updated_at).toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 border-t pt-2 border-slate-800/40">
                        <span className="text-slate-500 block text-[10px] mb-1">비밀번호 해시 (DB 암호화 저장값)</span>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] text-amber-400/90 bg-black/40 px-2 py-1 rounded border border-amber-500/20 break-all flex-1">
                            {userDetail.hashed_password}
                          </code>
                          <button
                            onClick={() => copyToClipboard(userDetail.hashed_password)}
                            className="p-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="복사"
                          >
                            {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── AI 모델 파라미터 및 환경 설정 ─── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" /> AI 모델 파라미터 및 환경 설정 (UserSettings)
                      </h4>
                      {!isEditingSettings ? (
                        <button
                          onClick={() => {
                            setIsEditingSettings(true);
                            setSettingsSaveMsg(null);
                            if (userDetail.settings) {
                              setEditTemperature(String(userDetail.settings.temperature));
                              setEditTopP(String(userDetail.settings.top_p));
                              setEditDarkMode(userDetail.settings.dark_mode);
                              setEditEnableThinking(userDetail.settings.enable_thinking);
                              setEditLanguage(userDetail.settings.language);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-indigo-600/20 border-indigo-600/40 hover:bg-indigo-600/30 text-indigo-300"
                        >
                          <Edit3 className="w-3 h-3" /> 편집
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setIsEditingSettings(false); setSettingsSaveMsg(null); }}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleSaveUserSettings}
                            disabled={isSavingSettings}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-emerald-600 border-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                          >
                            {isSavingSettings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            저장
                          </button>
                        </div>
                      )}
                    </div>

                    {settingsSaveMsg && (
                      <div className={`text-[11px] flex items-center gap-1.5 ${settingsSaveMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {settingsSaveMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{settingsSaveMsg.text}</span>
                      </div>
                    )}

                    {!isEditingSettings ? (
                      /* 읽기 전용 뷰 */
                      userDetail.settings ? (
                        <div className={`p-4 rounded-xl border grid grid-cols-3 gap-3 text-center ${
                          darkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="p-2 bg-black/20 rounded-lg">
                            <span className="text-slate-500 text-[10px] block">다크 모드</span>
                            <span className="font-bold text-indigo-400">{userDetail.settings.dark_mode ? 'ON' : 'OFF'}</span>
                          </div>
                          <div className="p-2 bg-black/20 rounded-lg">
                            <span className="text-slate-500 text-[10px] block">생각 기능(Thinking)</span>
                            <span className="font-bold text-indigo-400">{userDetail.settings.enable_thinking ? '활성화' : '비활성화'}</span>
                          </div>
                          <div className="p-2 bg-black/20 rounded-lg">
                            <span className="text-slate-500 text-[10px] block">언어 (Language)</span>
                            <span className="font-bold text-indigo-400 uppercase">{userDetail.settings.language}</span>
                          </div>
                          <div className="p-2 bg-black/20 rounded-lg">
                            <span className="text-slate-500 text-[10px] block">Temperature</span>
                            <span className="font-mono font-bold text-emerald-400">{userDetail.settings.temperature}</span>
                          </div>
                          <div className="p-2 bg-black/20 rounded-lg">
                            <span className="text-slate-500 text-[10px] block">Top P</span>
                            <span className="font-mono font-bold text-emerald-400">{userDetail.settings.top_p}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-800 text-slate-500">기본 설정 정보가 없습니다. (편집 버튼으로 새로 생성할 수 있습니다)</div>
                      )
                    ) : (
                      /* 편집 폼 */
                      <div className={`p-4 rounded-xl border space-y-3 ${
                        darkMode ? 'bg-neutral-950/60 border-indigo-800/40' : 'bg-slate-50 border-indigo-200'
                      }`}>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-400 text-[11px]">Temperature (0 ~ 2)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="2"
                              value={editTemperature}
                              onChange={(e) => setEditTemperature(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-400 text-[11px]">Top P (0 ~ 1)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={editTopP}
                              onChange={(e) => setEditTopP(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-400 text-[11px]">언어 (Language)</label>
                            <select
                              value={editLanguage}
                              onChange={(e) => setEditLanguage(e.target.value)}
                              className={inputCls}
                            >
                              <option value="ko">한국어 (ko)</option>
                              <option value="en">English (en)</option>
                              <option value="ja">日本語 (ja)</option>
                              <option value="zh">中文 (zh)</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDarkMode}
                              onChange={(e) => setEditDarkMode(e.target.checked)}
                              className="w-4 h-4 accent-indigo-500"
                            />
                            <span className="text-slate-300 text-[11px] font-semibold">다크 모드 활성화</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editEnableThinking}
                              onChange={(e) => setEditEnableThinking(e.target.checked)}
                              className="w-4 h-4 accent-indigo-500"
                            />
                            <span className="text-slate-300 text-[11px] font-semibold">Thinking 기능 활성화</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 일일 한도 설정 */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" /> 일일 한도 설정 (Daily Limit)
                    </h4>
                    <div className={`p-4 rounded-xl border space-y-4 ${
                      darkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}>
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
                                  : (darkMode ? 'bg-neutral-800/50 border-neutral-700/60 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200')
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {limitMode !== 'request_only' && (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">일일 토큰 한도 (숫자만 입력, 빈값 시 무제한)</label>
                          <input
                            type="number"
                            placeholder="예: 100000"
                            value={tokenLimit}
                            onChange={(e) => setTokenLimit(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      )}
                      {limitMode !== 'token_only' && (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-400">일일 요청 횟수 한도 (숫자만 입력, 빈값 시 무제한)</label>
                          <input
                            type="number"
                            placeholder="예: 30"
                            value={requestLimit}
                            onChange={(e) => setRequestLimit(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        {limitSaveMsg ? (
                          <div className={`text-[11px] flex items-center gap-1.5 ${
                            limitSaveMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {limitSaveMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>{limitSaveMsg.text}</span>
                          </div>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={handleSaveLimit}
                          disabled={isSavingLimit}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          {isSavingLimit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{isSavingLimit ? '저장 중...' : '한도 적용'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ─── 커스텀 지침 프로필 ─── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" /> 커스텀 지침 프로필 (Custom Instructions)
                      </h4>
                      {!isEditingInstruction ? (
                        <button
                          onClick={() => {
                            setIsEditingInstruction(true);
                            setInstructionSaveMsg(null);
                            if (userDetail.custom_instruction) {
                              setEditUserProfile(userDetail.custom_instruction.user_profile || '');
                              setEditResponseStyle(userDetail.custom_instruction.response_style || '');
                              setEditIsEnabled(userDetail.custom_instruction.is_enabled);
                            } else {
                              setEditUserProfile('');
                              setEditResponseStyle('');
                              setEditIsEnabled(true);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-indigo-600/20 border-indigo-600/40 hover:bg-indigo-600/30 text-indigo-300"
                        >
                          <Edit3 className="w-3 h-3" /> 편집
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setIsEditingInstruction(false); setInstructionSaveMsg(null); }}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleSaveInstruction}
                            disabled={isSavingInstruction}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer bg-emerald-600 border-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                          >
                            {isSavingInstruction ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            저장
                          </button>
                        </div>
                      )}
                    </div>

                    {instructionSaveMsg && (
                      <div className={`text-[11px] flex items-center gap-1.5 ${instructionSaveMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {instructionSaveMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{instructionSaveMsg.text}</span>
                      </div>
                    )}

                    {!isEditingInstruction ? (
                      /* 읽기 전용 뷰 */
                      userDetail.custom_instruction ? (
                        <div className={`p-4 rounded-xl border space-y-3 ${
                          darkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              userDetail.custom_instruction.is_enabled
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                              {userDetail.custom_instruction.is_enabled ? '활성화됨' : '비활성화됨'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block font-semibold mb-1">사용자 지정 프로필 / 배경 설명</span>
                            <div className="p-2.5 rounded-lg bg-black/30 text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800/60">
                              {userDetail.custom_instruction.user_profile || '(설정 안 됨)'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block font-semibold mb-1">선호하는 AI 답변 스타일 및 규칙</span>
                            <div className="p-2.5 rounded-lg bg-black/30 text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800/60">
                              {userDetail.custom_instruction.response_style || '(설정 안 됨)'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-800 text-slate-500">커스텀 지침이 없습니다. (편집 버튼으로 새로 생성할 수 있습니다)</div>
                      )
                    ) : (
                      /* 편집 폼 */
                      <div className={`p-4 rounded-xl border space-y-3 ${
                        darkMode ? 'bg-neutral-950/60 border-indigo-800/40' : 'bg-slate-50 border-indigo-200'
                      }`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsEnabled}
                            onChange={(e) => setEditIsEnabled(e.target.checked)}
                            className="w-4 h-4 accent-indigo-500"
                          />
                          <span className="text-slate-300 text-[11px] font-semibold">커스텀 지침 활성화</span>
                        </label>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-400 text-[11px]">사용자 지정 프로필 / 배경 설명</label>
                            <span className={`text-[10px] font-mono ${editUserProfile.length > 1800 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {editUserProfile.length} / 2000
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            placeholder="사용자의 배경, 직업, 관심사 등을 입력하세요..."
                            value={editUserProfile}
                            onChange={(e) => setEditUserProfile(e.target.value)}
                            className={textareaCls}
                            maxLength={2000}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-400 text-[11px]">선호하는 AI 답변 스타일 및 규칙</label>
                            <span className={`text-[10px] font-mono ${editResponseStyle.length > 1800 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {editResponseStyle.length} / 2000
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            placeholder="AI가 어떤 방식으로 답변해야 하는지 규칙을 입력하세요..."
                            value={editResponseStyle}
                            onChange={(e) => setEditResponseStyle(e.target.value)}
                            className={textareaCls}
                            maxLength={2000}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ===================== 3. 비밀번호 확인 및 즉시 변경 모달 ===================== */}
      {activeModal === 'password' && targetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setActiveModal('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              darkMode ? 'bg-neutral-900 border-neutral-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-800/40">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>[{targetUser.username}] 유저 비밀번호 관리</span>
              </h3>
              <button onClick={() => setActiveModal('none')} className={`p-1 rounded hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> 보안 참고 안내
                </div>
                <p className="leading-relaxed text-[11px] opacity-90">
                  데이터베이스 내 비밀번호는 단방향 암호화 해시(`hashed_password`)로 안전하게 보호되어 원본 평문 상태로 복원할 수 없습니다.
                  대신 관리자는 언제든지 해당 유저의 비밀번호를 지정된 새로운 임의의 비밀번호로 강제 재설정(리셋)할 수 있습니다.
                </p>
              </div>
              {userDetail && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">현재 DB 암호화 해시값</label>
                  <div className="p-2 rounded border border-slate-800 bg-black/40 text-[10px] font-mono text-slate-400 break-all">
                    {userDetail.hashed_password}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">새로 변경할 비밀번호 입력</label>
                <input
                  type="text"
                  placeholder="예: newpassword123!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className={`px-4 py-2 rounded-lg border text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer ${
                  darkMode ? 'bg-neutral-800 border-neutral-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isResettingPassword ? '변경 처리 중...' : '비밀번호 변경 적용'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 4. 사용자 삭제 확인 모달 ===================== */}
      {activeModal === 'delete' && targetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !isDeletingUser && setActiveModal('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all ${
              darkMode ? 'bg-neutral-900 border-red-900/50 text-slate-100' : 'bg-white border-red-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-red-900/30">
              <h3 className="font-bold text-sm flex items-center gap-2 text-red-400">
                <Trash2 className="w-4 h-4" />
                <span>사용자 계정 영구 삭제</span>
              </h3>
              <button
                onClick={() => !isDeletingUser && setActiveModal('none')}
                className={`p-1 rounded hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600'}`}
                disabled={isDeletingUser}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <ShieldAlert className="w-4 h-4" /> ⚠️ 되돌릴 수 없는 작업입니다
                </div>
                <p className="leading-relaxed text-[11px] opacity-90">
                  아래 사용자의 계정 및 모든 관련 데이터(대화 내역, 설정, 사용 기록 등)가 데이터베이스에서 <strong className="text-red-300">영구적으로 삭제</strong>됩니다.
                  이 작업은 절대 복구할 수 없습니다.
                </p>
              </div>
              <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold uppercase text-sm">
                    {targetUser.username[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{targetUser.username}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{targetUser.email}</div>
                  </div>
                </div>
              </div>
              <p className={`text-[11px] text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                정말로 <strong>{targetUser.username}</strong> 계정을 삭제하시겠습니까?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-red-900/20">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                disabled={isDeletingUser}
                className={`px-4 py-2 rounded-lg border text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-40 ${
                  darkMode ? 'bg-neutral-800 border-neutral-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingUser ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 삭제 처리 중...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> 영구 삭제 확인</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
