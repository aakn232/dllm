import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingBlockProps {
  content?: string | null;
  isStreaming?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);

  // 빈 thinking 태그(버그 현상) 감지하여 차단
  if (!content || !content.trim()) return null;

  return (
    <div className="my-2 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-purple-500/10 hover:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-medium transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 ${isStreaming ? 'animate-pulse text-purple-500 dark:text-purple-400' : ''}`} />
          <span>사고 과정 (Thinking Process)</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-3 text-slate-800 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap border-t border-purple-500/10 bg-purple-500/5 dark:bg-black/20">
          {content}
        </div>
      )}
    </div>
  );
};
