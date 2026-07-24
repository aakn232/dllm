import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div
          className="min-h-[250px] w-full p-6 my-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 shadow-lg transition-all"
          data-testid="error-boundary-fallback"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30 shadow-inner">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {this.props.fallbackTitle || '컴포넌트를 불러오는 중 오류가 발생했습니다.'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              예상치 못한 렌더링 예외가 발생했습니다. 아래 버튼을 눌러 다시 시도하거나 홈으로 이동하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> 홈으로 이동
            </button>
          </div>

          {/* 개발자 상세 에러 정보 */}
          {isDev && this.state.error && (
            <div className="w-full max-w-xl text-left mt-4 border border-slate-300 dark:border-neutral-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-neutral-900">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="w-full px-4 py-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
              >
                <span>개발자 상세 에러 정보</span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {this.state.showDetails && (
                <div className="p-4 border-t border-slate-300 dark:border-neutral-800 text-[11px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto space-y-2 max-h-60">
                  <div>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <pre className="text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
