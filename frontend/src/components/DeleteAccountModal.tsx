import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, deleteAccount } = useAuthStore();
  const { darkMode } = useChatStore();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_KEYWORD = '탈퇴';
  const isConfirmed = confirmText === CONFIRM_KEYWORD;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setConfirmText('');
      setError(null);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // deleteAccount 내부에서 상태 초기화 및 로그아웃 처리
    } catch (err: any) {
      setError(err.message || '계정 삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

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
            <div className="w-9 h-9 rounded-full bg-rose-500/15 flex items-center justify-center">
              <Trash2 className="w-4.5 h-4.5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-500">회원탈퇴</h2>
              <p className={`text-xs ${ darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.username}님의 계정
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

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 경고 박스 */}
          <div className={`flex gap-3 p-4 rounded-xl border ${
            darkMode
              ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">이 작업은 되돌릴 수 없습니다.</p>
              <ul className={`text-xs space-y-0.5 list-disc list-inside ${
                darkMode ? 'text-rose-400' : 'text-rose-600'
              }`}>
                <li>모든 대화 세션 및 메시지가 영구 삭제됩니다.</li>
                <li>맞춤 지침 설정이 삭제됩니다.</li>
                <li>계정 복구는 불가능합니다.</li>
              </ul>
            </div>
          </div>

          {/* 탈퇴 확인 입력 */}
          <div className="space-y-2">
            <label className={`block text-xs font-medium ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              탈퇴를 확인하려면 아래 입력란에{' '}
              <span className="font-bold text-rose-500">탈퇴</span>
              {'를 입력해주세요.'}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="탈퇴"
              disabled={isDeleting}
              className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition-colors ${
                isConfirmed
                  ? (darkMode ? 'border-rose-500 bg-rose-950/30 text-rose-300' : 'border-rose-400 bg-rose-50 text-rose-700')
                  : (darkMode
                      ? 'border-neutral-700 bg-neutral-800/60 text-slate-200 placeholder-slate-500 focus:border-neutral-600'
                      : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                    )
              }`}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className={`p-4 px-6 border-t flex items-center justify-end gap-3 ${
          darkMode ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              darkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>삭제 중...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>계정 영구 삭제</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
