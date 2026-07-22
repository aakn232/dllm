import React, { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface ThinkingBlockProps {
  content?: string | null;
  thinkingType?: 'Reasoning' | 'Thinking' | null;
  isStreaming?: boolean;
  hasAssistantContent?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  thinkingType,
  isStreaming,
  hasAssistantContent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [finalThinkingTime, setFinalThinkingTime] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isThinkingActive = isStreaming && !!content && !hasAssistantContent;

    if (isThinkingActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedSeconds(seconds);
          }
        }, 500);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startTimeRef.current && finalThinkingTime === null) {
        const total = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setFinalThinkingTime(total);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStreaming, content, hasAssistantContent, finalThinkingTime]);

  if (!content || !content.trim()) return null;

  const isThinkingActive = isStreaming && !hasAssistantContent;
  const displayTime = isThinkingActive ? elapsedSeconds : (finalThinkingTime || elapsedSeconds || 1);

  return (
    <div className="my-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden text-xs transition-all shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-medium transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          {isThinkingActive ? (
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          ) : (
            <Brain className="w-4 h-4 text-purple-500 dark:text-purple-400 group-hover:scale-105 transition-transform" />
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isThinkingActive ? '생각 중...' : `${displayTime}초 동안 생각함`}
            </span>
            {isThinkingActive && (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                ({displayTime}초)
              </span>
            )}
            {thinkingType && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50">
                {thinkingType}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          <span className="text-[11px] opacity-75">{isOpen ? '접기' : '펼치기'}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="relative px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40">
          <div className="absolute left-3 top-3 bottom-3 w-0.5 rounded-full bg-purple-500/40 dark:bg-purple-400/30" />
          <div className="pl-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap select-text break-words">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

