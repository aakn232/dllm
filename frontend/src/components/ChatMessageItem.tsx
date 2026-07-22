import React, { useState } from 'react';
import type { ChatMessage } from '../types/chat';
import { ThinkingBlock } from './ThinkingBlock';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSmoothStreaming } from '../hooks/useSmoothStreaming';
import { useChatStore } from '../store/useChatStore';
import { Bot, User, RefreshCw, Edit2, Check, X, Gauge, Trash2 } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const { isGenerating, regenerateMessage, editAndResendMessage, deleteMessagePair, darkMode, tps } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const smoothText = useSmoothStreaming(
    message.content,
    message.isStreaming ?? false
  );

  const handleEditSubmit = () => {
    if (!editContent.trim()) return;
    setIsEditing(false);
    // 메시지 수정 및 이전 시점으로 롤백/트렁케이트(Truncate) 후 재생성 호출
    editAndResendMessage(message.id, editContent, message.attachments);
  };

  const handleDelete = () => {
    if (window.confirm("이 대화(질문 및 답변 세트)를 삭제하시겠습니까?")) {
      deleteMessagePair(message.id);
    }
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
            {isUser && !isGenerating && (
              <>
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
              <img
                key={idx}
                src={att.file_url}
                alt="첨부 이미지"
                className="max-w-xs max-h-48 rounded-lg border border-slate-300 dark:border-slate-700 object-cover shadow"
              />
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
            {!isUser && message.thinking_content && (
              <ThinkingBlock
                content={message.thinking_content}
                thinkingType={message.thinking_type}
                isStreaming={message.isStreaming}
                hasAssistantContent={!!message.content && message.content.trim().length > 0}
              />
            )}

            <MarkdownRenderer content={isUser ? message.content : smoothText} />
          </>
        )}
      </div>
    </div>
  );
};
