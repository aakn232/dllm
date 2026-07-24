import type { FC } from 'react';

export const ChatMessageSkeleton: FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full py-6 px-4" data-testid="chat-message-skeleton">
      {/* User message skeleton */}
      <div className="flex gap-4 items-start py-3">
        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-neutral-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-20 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Assistant message skeleton with shimmer animation */}
      <div className="flex gap-4 items-start py-4 px-4 rounded-xl bg-slate-100/70 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/40">
        <div className="w-8 h-8 rounded-full bg-indigo-600/40 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-3 w-28 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="space-y-2 animate-shimmer rounded-lg">
            <div className="h-4 w-5/6 bg-slate-300 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-4/6 bg-slate-300 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-300 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      </div>

      {/* Additional assistant skeleton block for visual fullness */}
      <div className="flex gap-4 items-start py-4 px-4 rounded-xl bg-slate-100/70 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800/40">
        <div className="w-8 h-8 rounded-full bg-indigo-600/40 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-3 w-24 bg-slate-300 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="space-y-2 animate-shimmer rounded-lg">
            <div className="h-4 w-full bg-slate-300 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-4/5 bg-slate-300 dark:bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
