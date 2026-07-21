import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useChatStore } from '../store/useChatStore';
import { X, Sliders, Sparkles, Save, Info, AlertCircle } from 'lucide-react';
import type { CustomInstructionPreset } from '../types/chat';

const PRESETS: CustomInstructionPreset[] = [
  {
    label: '💻 개발자 모드',
    description: '주석 포함 깔끔한 코드와 타입 안전성 중심',
    user_profile: '저는 풀스택 개발자입니다. 주 프로그래밍 언어는 TypeScript, Python, React입니다.',
    response_style: '답변 시 관련 코드에는 핵심 주석을 달아주시고, 가독성과 타입 안전성을 최우선으로 설명해주세요.'
  },
  {
    label: '⚡ 간결 숏폼 모드',
    description: '서론 생략, 핵심 결론 및 요점 정리',
    user_profile: '빠르고 효율적인 직관적 요약 답변을 선호합니다.',
    response_style: '불필요한 인삿말이나 서론은 생략하고 핵심 내용과 항목별 요점 위주로 간결하게 답변하세요.'
  },
  {
    label: '🎓 친절한 튜터 모드',
    description: '원리와 개념을 쉬운 비유로 차근차근 설명',
    user_profile: '새로운 기술과 개념을 기초부터 깊이 있게 배우고 싶어 합니다.',
    response_style: '쉬운 예시와 친절한 어조로 개념부터 원리까지 단계별로 차근차근 설명해 주세요.'
  }
];

export const CustomInstructionsModal: React.FC = () => {
  const { customInstruction, isModalOpen, closeModal, updateCustomInstructions, isLoading } = useSettingsStore();
  const { darkMode } = useChatStore();

  const [draftUserProfile, setDraftUserProfile] = useState('');
  const [draftResponseStyle, setDraftResponseStyle] = useState('');
  const [draftIsEnabled, setDraftIsEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 모달 오픈 및 데이터 수신 시 draft 초기화
  useEffect(() => {
    if (isModalOpen) {
      if (customInstruction) {
        setDraftUserProfile(customInstruction.user_profile || '');
        setDraftResponseStyle(customInstruction.response_style || '');
        setDraftIsEnabled(customInstruction.is_enabled ?? true);
      } else {
        setDraftUserProfile('');
        setDraftResponseStyle('');
        setDraftIsEnabled(true);
      }
    }
  }, [isModalOpen, customInstruction]);

  if (!isModalOpen) return null;

  const handlePresetSelect = (preset: CustomInstructionPreset) => {
    setDraftUserProfile(preset.user_profile);
    setDraftResponseStyle(preset.response_style);
    showToast(`'${preset.label}' 템플릿이 적용되었습니다.`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    if (draftUserProfile.length > 2000 || draftResponseStyle.length > 2000) {
      showToast('각 지침은 2,000자를 초과할 수 없습니다.');
      return;
    }

    const success = await updateCustomInstructions({
      user_profile: draftUserProfile,
      response_style: draftResponseStyle,
      is_enabled: draftIsEnabled
    });

    if (success) {
      showToast('맞춤 지침이 저장되었습니다.');
      setTimeout(() => {
        closeModal();
      }, 500);
    } else {
      showToast('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden transition-all ${
          darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 모달 헤더 */}
        <div className={`p-4 px-6 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                맞춤 지침 (Custom Instructions)
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                모든 대화 생성 시 AI 응답에 자동으로 반영될 지침을 작성하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 활성화 토글 */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
              <span className={draftIsEnabled ? 'text-indigo-400' : (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                {draftIsEnabled ? '사용 중' : '비활성'}
              </span>
              <div
                onClick={() => setDraftIsEnabled(!draftIsEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  draftIsEnabled ? 'bg-indigo-600' : (darkMode ? 'bg-slate-700' : 'bg-slate-300')
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    draftIsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

            <button
              onClick={closeModal}
              className={`p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors ${
                darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Toast 알림 */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between animate-shake">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {toastMessage}
              </span>
            </div>
          )}

          {/* 프리셋 템플릿 영역 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              빠른 프리셋 템플릿
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                    darkMode
                      ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-indigo-500/50'
                      : 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-300'
                  }`}
                >
                  <span className="font-bold mb-1">{p.label}</span>
                  <span className={`text-[11px] line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {p.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. 사용자 배경 및 정보 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <span>1. AI가 당신에 대해 알아야 할 사항</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </label>

              <span className={`text-[11px] ${
                draftUserProfile.length > 2000 ? 'text-rose-500 font-bold' : (darkMode ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {draftUserProfile.length} / 2,000자
              </span>
            </div>

            <textarea
              rows={4}
              value={draftUserProfile}
              onChange={(e) => setDraftUserProfile(e.target.value)}
              placeholder="예: 저는 풀스택 개발자이며 Python과 React를 주로 사용합니다. 초보자보다는 시니어 수준의 심도 깊은 답변을 선호합니다."
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-none ${
                darkMode
                  ? 'bg-slate-800/60 border-slate-700 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* 2. 답변 스타일 및 원칙 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <span>2. AI가 어떻게 응답하길 원하시나요?</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </label>

              <span className={`text-[11px] ${
                draftResponseStyle.length > 2000 ? 'text-rose-500 font-bold' : (darkMode ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {draftResponseStyle.length} / 2,000자
              </span>
            </div>

            <textarea
              rows={4}
              value={draftResponseStyle}
              onChange={(e) => setDraftResponseStyle(e.target.value)}
              placeholder="예: 서론 없이 결론부터 전달해주세요. 코드를 작성할 때는 항상 주요 지점에 간단한 주석을 달아주시고, 가독성을 고려해 명확히 정리해주세요."
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-none ${
                darkMode
                  ? 'bg-slate-800/60 border-slate-700 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className={`p-3 rounded-xl border flex items-start gap-2 text-[11px] ${
            darkMode ? 'bg-slate-800/30 border-slate-700/50 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
          }`}>
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              작성하신 맞춤 지침은 개인화 및 응답 스타일 결정에 우선 활용되며, 보안 규칙 및 시스템 정책을 우회하지 않습니다.
            </span>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className={`p-4 px-6 border-t flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={closeModal}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            취소
          </button>

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isLoading ? '저장 중...' : '지침 저장하기'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
