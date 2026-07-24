import type { FC } from 'react';

interface Props {
  shouldCrash?: boolean;
}

export const ErrorBuggyComponent: FC<Props> = ({ shouldCrash = true }) => {
  if (shouldCrash) {
    throw new Error('Intentional rendering error for ErrorBoundary test');
  }

  return (
    <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-xl" data-testid="buggy-component-recovered">
      Component rendered successfully!
    </div>
  );
};
