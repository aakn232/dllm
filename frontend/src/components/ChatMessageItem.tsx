import React, { useState } from 'react';
import type { ChatMessage } from '../types/chat';
import { ThinkingBlock } from './ThinkingBlock';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSmoothStreaming } from '../hooks/useSmoothStreaming';
import { useChatStore } from '../store/useChatStore';
import { Bot, User, RefreshCw, Edit2, Check, X, Gauge } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const { isGenerating, regenerateMessage, editAndResendMessage, darkMode, tps } = useChatStore();
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
    <div className={`py-5 px-4 md:px-6 flex gap-4 transition-colors ${
      isUser
        ? 'bg-transparent'
        : (darkMode ? 'bg-slate-900/40 border-y border-slate-800/40' : 'bg-slate-100/70 border-y border-slate-200')
    }`}>
      {/* 아바타 */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-300 text-slate-700'
          }`}>
            <User className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* 본문 콘텐츠 */}
      <div className="flex-1 overflow-hidden space-y-2">
        <div className={`flex items-center justify-between text-xs font-medium ${
          darkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <span>{isUser ? '사용자' : 'DiffusionGemma AI'}</span>
          {isUser && !isGenerating && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1 transition-colors ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-900 text-slate-500'}`}
              title="메시지 수정 후 재전송"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {!isUser && (
            <div className="flex items-center gap-2.5">
              {((message.tps !== undefined && message.tps > 0) || (message.isStreaming && tps > 0)) ? (
                <div className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-mono text-[11px] transition-colors ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700/80 text-indigo-400'
                    : 'bg-white border-slate-300 text-indigo-600 shadow-sm'
                }`}>
                  <Gauge className={`w-3.5 h-3.5 ${message.isStreaming ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>{message.isStreaming ? tps : message.tps} tokens/sec</span>
                  {message.isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
              ) : null}

              {!isGenerating && (
                <button
                  onClick={() => regenerateMessage(message.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                  }`}
                  title="답변 다시 생성"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>재생성</span>
                </button>
              )}
            </div>
          )}
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
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
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
