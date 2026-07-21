import React from 'react';
import { useChatStore } from '../store/useChatStore';
import { Gauge } from 'lucide-react';

export const DevMetricsIndicator: React.FC = () => {
  const { tps, isGenerating, darkMode } = useChatStore();

  if (!isGenerating && tps === 0) return null;

  return (
    <div className={`px-2.5 py-1 rounded-full border flex items-center gap-2 text-xs font-mono transition-colors ${
      darkMode
        ? 'bg-slate-900/90 border-slate-700/80 text-indigo-400'
        : 'bg-white border-slate-300 text-indigo-600 shadow-sm'
    }`}>
      <Gauge className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
      <span>{tps} tokens/sec</span>
      {isGenerating && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  );
};
