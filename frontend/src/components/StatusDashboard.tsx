import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { Activity, Server, Database, Key, RefreshCw, X, AlertTriangle, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

interface StatusData {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  services: {
    backend_server: {
      name: string;
      status: string;
      port: number;
    };
    database: {
      name: string;
      status: string;
      error?: string;
      metrics: {
        total_sessions: number;
        total_messages: number;
      };
    };
    nvidia_nim_api: {
      name: string;
      model: string;
      api_url: string;
      api_key_configured: boolean;
      ping_success: boolean;
      latency_ms?: number;
      error?: string;
    };
  };
  logs: {
    error_warning_count: number;
    recent_logs: Array<{
      timestamp: string;
      level: string;
      message: string;
      logger: string;
    }>;
  };
}

interface StatusDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({ isOpen, onClose }) => {
  const { darkMode } = useChatStore();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(`HTTP ${res.status}: 백엔드 서버 응답 실패`);
      }
    } catch (err: any) {
      setError(`백엔드 서버에 연결할 수 없습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // 10초마다 자동 갱신
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* 상단 헤더 */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                백엔드 시스템 상태 대시보드
                {data && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    data.status === 'Healthy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {data.status}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                백엔드 서버, 데이터베이스, NVIDIA NIM API 통신 상태 및 오류 수집기
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">서버 상태 확인 실패</p>
                <p className="text-xs text-rose-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* 주요 상태 카드 3종 */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. 백엔드 프록시 서버 카드 */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>FastAPI 백엔드</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Online
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-400">
                  <p>Port: <span className="text-slate-200">{data.services.backend_server.port}</span></p>
                  <p>가동 시간: <span className="text-slate-200">{data.uptime.formatted}</span></p>
                </div>
              </div>

              {/* 2. 데이터베이스 카드 */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>데이터베이스 (SQLite)</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    data.services.database.status === 'Healthy' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {data.services.database.status === 'Healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {data.services.database.status}
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-400">
                  <p>총 대화 세션: <span className="text-slate-200">{data.services.database.metrics.total_sessions}개</span></p>
                  <p>총 메시지 이력: <span className="text-slate-200">{data.services.database.metrics.total_messages}개</span></p>
                </div>
              </div>

              {/* 3. NVIDIA NIM API 카드 */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>NVIDIA NIM API</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    data.services.nvidia_nim_api.ping_success ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {data.services.nvidia_nim_api.ping_success ? (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        {data.services.nvidia_nim_api.latency_ms} ms
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {data.services.nvidia_nim_api.api_key_configured ? '핑 실패' : 'Key 미설정'}
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-400">
                  <p>모델: <span className="text-slate-200 text-[10px] truncate block">{data.services.nvidia_nim_api.model}</span></p>
                  <p>API Key: <span className={data.services.nvidia_nim_api.api_key_configured ? 'text-emerald-400' : 'text-amber-400'}>
                    {data.services.nvidia_nim_api.api_key_configured ? '설정됨 (Valid)' : '미설정 (.env 확인)'}
                  </span></p>
                </div>
              </div>
            </div>
          )}

          {/* NVIDIA 오류 안내문 (필요 시) */}
          {data?.services.nvidia_nim_api.error && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>NVIDIA API 진단 결과</span>
              </div>
              <p className="font-mono">{data.services.nvidia_nim_api.error}</p>
            </div>
          )}

          {/* 최근 백엔드 로그 Inspector */}
          {data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>백엔드 실시간 이벤트 & 오류 로그 (최근 20건)</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  경고/오류: {data.logs.error_warning_count}건
                </span>
              </div>

              <div className={`rounded-xl border font-mono text-xs overflow-hidden max-h-64 overflow-y-auto ${
                darkMode ? 'bg-black/60 border-slate-800' : 'bg-slate-900 text-slate-200 border-slate-300'
              }`}>
                {data.logs.recent_logs.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    수집된 에러 및 이벤트 로그가 없습니다. 백엔드가 정상 구동 중입니다.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {data.logs.recent_logs.map((log, idx) => (
                      <div key={idx} className="p-3 flex items-start gap-3 hover:bg-slate-800/40 transition-colors">
                        <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">{log.timestamp}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          log.level === 'ERROR' || log.level === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : log.level === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-slate-300 break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-slate-400 ${
          darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <span>최종 갱신: {data?.timestamp || '확인 중...'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
