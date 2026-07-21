import React, { useState, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import type { Attachment } from '../types/chat';
import { Send, Square, Paperclip, X, Brain } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const { sendMessage, isGenerating, stopGeneration, enableThinking, setEnableThinking, darkMode } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    sendMessage(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // 이미지 처리 (파일 업로드, 드래그앤드롭, 클립보드)
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setAttachments(prev => [
              ...prev,
              { file_type: file.type, file_url: e.target!.result as string }
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={`p-4 border-t max-w-4xl mx-auto w-full rounded-t-2xl shadow-xl backdrop-blur-md transition-colors ${
      darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-300 bg-white/90 shadow-slate-200'
    }`}>
      {/* 첨부 이미지 미리보기 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att, index) => (
            <div key={index} className="relative group">
              <img
                src={att.file_url}
                alt="미리보기"
                className="w-16 h-16 object-cover rounded-lg border border-slate-700"
              />
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`flex flex-col rounded-xl border focus-within:border-indigo-500 transition-colors ${
          darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'
        }`}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="메시지를 입력하세요... (Enter 또는 Ctrl+Enter: 전송, Shift+Enter: 줄바꿈, 이미지 붙여넣기/드롭 가능)"
          rows={2}
          className={`w-full p-3 bg-transparent text-sm focus:outline-none resize-none ${
            darkMode ? 'text-slate-100 placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
          }`}
        />

        {/* 툴바 (Thinking 모드 토글, 파일 첨부, 전송/중단 버튼) */}
        <div className={`flex items-center justify-between px-3 py-2 border-t text-xs ${
          darkMode ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            {/* 파일 선택 숨김 인풋 */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 transition-colors ${
                darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span className="hidden sm:inline">이미지 첨부</span>
            </button>

            {/* Thinking 모드 토글 스위치 */}
            <button
              onClick={() => setEnableThinking(!enableThinking)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors ${
                enableThinking
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : (darkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-200 text-slate-500')
              }`}
              title="DiffusionGemma 사고과정 (Thinking Process) 표시 여부"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Thinking {enableThinking ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div>
            {isGenerating ? (
              <button
                onClick={stopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>중단</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>전송</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
