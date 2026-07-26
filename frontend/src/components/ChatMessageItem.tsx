import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage } from '../types/chat';
import { ThinkingBlock } from './ThinkingBlock';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSmoothStreaming } from '../hooks/useSmoothStreaming';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { Bot, User, RefreshCw, Edit2, Check, X, Gauge, Trash2, Code, Copy, CheckCheck } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const { isGenerating, regenerateMessage, editAndResendMessage, deleteMessagePair, darkMode, tps } = useChatStore();
  const { user } = useAuthStore();
  const isAdmin = !!user?.is_admin;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);

  // 모달 활성화 시 배경(#root)에 inert 속성을 부여하여 브라우저 Ctrl+F 검색 대상에서 배경 제외
  useEffect(() => {
    if (showJsonModal) {
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.setAttribute('inert', '');
      }
      return () => {
        if (rootEl) {
          rootEl.removeAttribute('inert');
        }
      };
    }
  }, [showJsonModal]);

  const smoothText = useSmoothStreaming(
    message.content,
    message.isStreaming ?? false
  );

  const handleEditSubmit = () => {
    if (!editContent.trim()) return;
    setIsEditing(false);
    editAndResendMessage(message.id, editContent, message.attachments);
  };

  const handleDelete = () => {
    if (window.confirm("이 대화(질문 및 답변 세트)를 삭제하시겠습니까?")) {
      deleteMessagePair(message.id);
    }
  };

  const getJsonString = () => {
    if (message.raw_response) {
      try {
        const parsed = JSON.parse(message.raw_response);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return message.raw_response;
      }
    }
    return JSON.stringify(message, null, 2);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(getJsonString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 메시지 복사 (사용자: 원래 입력 텍스트, AI: 렌더링된 smoothText)
  const handleCopyMessage = () => {
    const textToCopy = isUser ? message.content : smoothText;
    navigator.clipboard.writeText(textToCopy);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      }
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`py-3.5 px-3 sm:py-5 sm:px-6 flex gap-2.5 sm:gap-4 transition-colors group ${
      isUser
        ? 'bg-transparent'
        : (darkMode ? 'bg-neutral-900/40 border-y border-neutral-800/40' : 'bg-slate-100/70 border-y border-slate-200')
    }`}>
      {/* 아바타 */}
      <div className="flex-shrink-0 pt-0.5">
        {isUser ? (
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-300 text-slate-700'
          }`}>
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      {/* 본문 콘텐츠 */}
      <div className="flex-1 overflow-hidden space-y-2">
        <div className={`flex items-center justify-between text-xs font-medium ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <span>{isUser ? '사용자' : 'DiffusionGemma AI'}</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 관리자 전용 Raw JSON 보기 버튼 */}
            {isAdmin && (
              <button
                onClick={() => setShowJsonModal(true)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  darkMode
                    ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200'
                }`}
                title={message.raw_response ? "원본 데이터 보기 (Raw API Response)" : "상태 데이터 보기 (Processed State Fallback)"}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">JSON</span>
              </button>
            )}

            {isUser && !isGenerating && (
              <>
                {/* 메시지 복사 버튼 (사용자) */}
                <button
                  onClick={handleCopyMessage}
                  className={`p-1 transition-colors cursor-pointer ${
                    msgCopied
                      ? 'text-emerald-500'
                      : (darkMode ? 'text-slate-500 hover:text-slate-200' : 'text-slate-400 hover:text-slate-900')
                  }`}
                  title="메시지 복사"
                >
                  {msgCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-1 transition-colors cursor-pointer ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900 text-slate-500'}`}
                  title="메시지 수정 후 재전송"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  className={`p-1 transition-colors cursor-pointer ${
                    darkMode
                      ? 'text-slate-500 hover:text-rose-400'
                      : 'text-slate-400 hover:text-rose-600'
                  }`}
                  title="대화 세트(질문+답변) 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {!isUser && (
              <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
                {((message.tps !== undefined && message.tps > 0) || (message.isStreaming && tps > 0)) ? (
                  <div className={`px-2 py-0.5 rounded-full border flex items-center gap-1 font-mono text-[10px] sm:text-[11px] transition-colors ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700/80 text-indigo-400'
                      : 'bg-white border-slate-300 text-indigo-600 shadow-sm'
                  }`}>
                    <Gauge className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${message.isStreaming ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>{message.isStreaming ? tps : message.tps} t/s</span>
                    {message.isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                ) : null}

                {/* 메시지 복사 버튼 (AI 답변) */}
                {!message.isStreaming && message.content && (
                  <button
                    onClick={handleCopyMessage}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      msgCopied
                        ? 'text-emerald-500'
                        : (darkMode
                          ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80')
                    }`}
                    title="답변 복사"
                  >
                    {msgCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden xs:inline">{msgCopied ? '복사됨' : '복사'}</span>
                  </button>
                )}

                {!isGenerating && (
                  <button
                    onClick={() => regenerateMessage(message.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      darkMode
                        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                    }`}
                    title="답변 다시 생성"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">재생성</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 첨부 이미지 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.attachments.map((att, idx) => (
              att.file_type.startsWith('video/') ? (
                <video
                  key={idx}
                  src={att.file_url}
                  controls
                  className="max-w-xs max-h-48 rounded-lg border border-slate-300 dark:border-slate-700 shadow"
                />
              ) : (
                <img
                  key={idx}
                  src={att.file_url}
                  alt="첨부 이미지"
                  className="max-w-xs max-h-48 rounded-lg border border-slate-300 dark:border-slate-700 object-cover shadow"
                />
              )
            ))}
          </div>
        )}

        {/* 수정 편집창 */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className={`w-full p-3 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none border ${
                darkMode ? 'bg-neutral-800 border-neutral-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <X className="w-3.5 h-3.5" /> 취소
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs text-white flex items-center gap-1 font-medium"
              >
                <Check className="w-3.5 h-3.5" /> 재전송
              </button>
            </div>
          </div>
        ) : (
          <>
            {!isUser && (message.reasoning_content || message.thinking_content) && (
              <ThinkingBlock
                reasoningContent={message.reasoning_content}
                thinkingContent={message.thinking_content}
                thinkingType={message.thinking_type}
                isStreaming={message.isStreaming}
                hasAssistantContent={!!message.content && message.content.trim().length > 0}
              />
            )}

            <MarkdownRenderer content={isUser ? message.content : smoothText} />
          </>
        )}
      </div>

      {/* 관리자 전용 원본 JSON 모달 (Portal로 body에 렌더링 + root에 inert 부여하여 Ctrl+F 배경 탐색 제외) */}
      {showJsonModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowJsonModal(false)}>
          <div className={`relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border ${
            darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${
              darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-500" />
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">
                    {message.raw_response ? 'API 원본 데이터 (Raw Chunks)' : '가공된 상태 데이터 (Fallback)'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    message.raw_response 
                      ? (darkMode ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                      : (darkMode ? 'bg-amber-900/50 text-amber-300 border-amber-700/50' : 'bg-amber-50 text-amber-600 border-amber-200')
                  }`}>
                    {message.raw_response ? 'Original API Response' : 'Processed State Object'}
                  </span>
                  <span className="text-xs font-normal text-indigo-400 ml-1">(관리자 전용)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '복사됨' : 'JSON 복사'}
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed">
              <pre className={`p-4 rounded-lg whitespace-pre-wrap break-words break-all selection:bg-indigo-500 selection:text-white ${
                darkMode ? 'bg-slate-950 text-indigo-300 border border-slate-800' : 'bg-slate-900 text-indigo-300'
              }`}>
                {getJsonString()}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
