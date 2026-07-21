import { create } from 'zustand';
import type { ChatSession, ChatMessage, Attachment } from '../types/chat';
import { authFetch } from '../utils/apiClient';

const API_BASE = 'http://localhost:8000/api/v1';

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  enableThinking: boolean;
  darkMode: boolean;
  isGenerating: boolean;
  tps: number;
  abortController: AbortController | null;

  // Actions
  fetchSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  selectSession: (id: string) => Promise<void>;
  updateSessionTitle: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  goHome: () => void;
  
  setEnableThinking: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  stopGeneration: () => void;
  
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  editAndResendMessage: (messageId: string, newContent: string, attachments?: Attachment[]) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  enableThinking: typeof window !== 'undefined' && localStorage.getItem('enableThinking') !== null
    ? localStorage.getItem('enableThinking') === 'true'
    : true,
  darkMode: typeof window !== 'undefined' && localStorage.getItem('darkMode') !== null
    ? localStorage.getItem('darkMode') === 'true'
    : true,
  isGenerating: false,
  tps: 0,
  abortController: null,

  goHome: () => set({ currentSessionId: null, messages: [] }),

  fetchSessions: async () => {
    try {
      const res = await authFetch(`${API_BASE}/sessions`);
      if (res.ok) {
        const data = await res.json();
        set({ sessions: data });
        if (data.length > 0 && !get().currentSessionId) {
          get().selectSession(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  },

  createSession: async () => {
    set({ currentSessionId: null, messages: [] });
    return '';
  },

  selectSession: async (id: string) => {
    set({ currentSessionId: id });
    try {
      const res = await authFetch(`${API_BASE}/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        const loadedMessages = data.messages || [];
        const restoredMessages = loadedMessages.map((m: ChatMessage) => {
          if (m.role === 'assistant' && typeof window !== 'undefined') {
            const savedTps = localStorage.getItem(`tps_${m.id}`);
            if (savedTps) {
              return { ...m, tps: parseInt(savedTps, 10) };
            }
          }
          return m;
        });
        set({ messages: restoredMessages });
      }
    } catch (err) {
      console.error("Failed to load session messages:", err);
    }
  },

  updateSessionTitle: async (id: string, title: string) => {
    try {
      const res = await authFetch(`${API_BASE}/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        set(state => ({
          sessions: state.sessions.map(s => s.id === id ? { ...s, title } : s)
        }));
      }
    } catch (err) {
      console.error("Failed to update session title:", err);
    }
  },

  deleteSession: async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set(state => {
          const filtered = state.sessions.filter(s => s.id !== id);
          const nextSessionId = filtered.length > 0 ? filtered[0].id : null;
          return {
            sessions: filtered,
            currentSessionId: nextSessionId,
            messages: nextSessionId ? state.messages : []
          };
        });
        if (get().currentSessionId) {
          get().selectSession(get().currentSessionId!);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  },

  setEnableThinking: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableThinking', String(enabled));
    }
    set({ enableThinking: enabled });
  },

  toggleDarkMode: () => {
    const nextMode = !get().darkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(nextMode));
      if (nextMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.classList.add('light');
      }
    }
    set({ darkMode: nextMode });
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isGenerating: false, abortController: null });
    }
  },

  sendMessage: async (content: string, attachments: Attachment[] = []) => {
    let sessionId = get().currentSessionId;
    if (!sessionId) {
      try {
        const title = content.trim().slice(0, 30) || '새 대화';
        const res = await authFetch(`${API_BASE}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });
        if (res.ok) {
          const newSession = await res.json();
          sessionId = newSession.id;
          set(state => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id
          }));
        }
      } catch (err) {
        console.error("Failed to create session on first message:", err);
      }
    }
    if (!sessionId) return;

    // 1. 사용자 메시지 생성
    let userMsgTempId = 'user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgTempId,
      session_id: sessionId,
      role: 'user',
      content,
      attachments,
      created_at: new Date().toISOString()
    };

    const previousMessages = get().messages;

    // 2. 어시스턴트 임시 메시지 생성
    const assistantMsgTempId = 'assistant-' + Date.now();
    const assistantMsg: ChatMessage = {
      id: assistantMsgTempId,
      session_id: sessionId,
      role: 'assistant',
      content: '',
      thinking_content: '',
      isStreaming: true,
      tps: 0,
      created_at: new Date().toISOString()
    };

    set(state => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isGenerating: true
    }));

    // 백엔드에 사용자 메시지 저장 및 서버 UUID 동기화
    try {
      const res = await authFetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content,
          attachments
        })
      });
      if (res.ok) {
        const savedMsg = await res.json();
        set(state => ({
          messages: state.messages.map(m => m.id === userMsgTempId ? { ...m, id: savedMsg.id } : m)
        }));
        userMsg.id = savedMsg.id;
      }
    } catch (e) {
      console.error("Failed to persist user message:", e);
    }

    const controller = new AbortController();
    set({ abortController: controller });

    const validHistory = [...previousMessages, userMsg].filter(m => {
      if (m.role === 'assistant') {
        return m.content && m.content.trim().length > 0;
      }
      return true;
    });

    const formattedMessages = validHistory.map(m => {
      if (m.attachments && m.attachments.length > 0) {
        const contentParts: any[] = [{ type: "text", text: m.content }];
        m.attachments.forEach(att => {
          contentParts.push({
            type: "image_url",
            image_url: { url: att.file_url }
          });
        });
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: m.content };
    });

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const response = await authFetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
          messages: formattedMessages,
          enable_thinking: get().enableThinking
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errJson = await response.json().catch(() => ({ detail: { message: '일일 제한 한도를 초과했습니다.' } }));
          const detailMsg = typeof errJson.detail === 'object' ? errJson.detail.message : errJson.detail;
          throw new Error(detailMsg || '한도 초과');
        }
        const errJson = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(errJson.detail || 'Failed to complete chat');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      let streamAssistantContent = '';
      let streamThinkingContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'content') {
              streamAssistantContent += data.delta;
              tokenCount += data.delta.split(/\s+/).length || 1;
            } else if (data.type === 'thinking' || data.type === 'thinking_stream') {
              streamThinkingContent += data.delta;
            } else if (data.type === 'message_id') {
              const elapsedSec = (performance.now() - startTime) / 1000;
              const currentTps = elapsedSec > 0 ? Math.round(tokenCount / elapsedSec) : 0;
              if (typeof window !== 'undefined') {
                localStorage.setItem(`tps_${data.id}`, String(currentTps));
              }
              set(state => ({
                messages: state.messages.map(m =>
                  m.id === assistantMsgTempId ? { ...m, id: data.id, tps: currentTps } : m
                )
              }));
              continue;
            }

            const elapsedSec = (performance.now() - startTime) / 1000;
            const currentTps = elapsedSec > 0 ? Math.round(tokenCount / elapsedSec) : 0;

            set(state => ({
              tps: currentTps,
              messages: state.messages.map(m =>
                m.id === assistantMsgTempId
                  ? {
                      ...m,
                      content: streamAssistantContent,
                      thinking_content: streamThinkingContent,
                      tps: currentTps
                    }
                  : m
              )
            }));
          } catch (e) {
            console.error("Error parsing SSE JSON:", e);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Streaming error:", err);
        set(state => ({
          messages: state.messages.map(m =>
            m.id === assistantMsgTempId
              ? { ...m, content: m.content + `\n\n⚠️ 오류 발생: ${err.message}` }
              : m
          )
        }));
      }
    } finally {
      set(state => ({
        isGenerating: false,
        abortController: null,
        messages: state.messages.map(m =>
          m.role === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m
        )
      }));
    }
  },

  // 메시지 수정 및 롤백/트렁케이트(Truncate) 처리 액션
  editAndResendMessage: async (messageId: string, newContent: string, attachments: Attachment[] = []) => {
    const { currentSessionId, messages } = get();
    if (!currentSessionId) return;

    // 1. 해당 메시지 위치 탐색
    const targetIdx = messages.findIndex(m => m.id === messageId);
    if (targetIdx === -1) return;

    // 2. 해당 메시지 내용 업데이트 및 targetIdx 이후 모든 메시지 즉시 롤백/트렁케이트 (Rollback/Truncate)
    const updatedUserMsg: ChatMessage = {
      ...messages[targetIdx],
      content: newContent,
      attachments
    };

    const truncatedHistory = [...messages.slice(0, targetIdx), updatedUserMsg];

    // 어시스턴트 신규 대화 스트림용 객체 준비
    const assistantMsgTempId = 'assistant-' + Date.now();
    const newAssistantMsg: ChatMessage = {
      id: assistantMsgTempId,
      session_id: currentSessionId,
      role: 'assistant',
      content: '',
      thinking_content: '',
      isStreaming: true,
      created_at: new Date().toISOString()
    };

    // UI에서 기존 이후 메시지 완전 트렁케이트 렌더링!
    set({
      messages: [...truncatedHistory, newAssistantMsg],
      isGenerating: true
    });

    // 3. 백엔드 DB 메시지 수정 및 트렁케이트 API 호출
    try {
      const res = await authFetch(`${API_BASE}/sessions/${currentSessionId}/messages/${messageId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: newContent,
          attachments
        })
      });
      if (res.ok) {
        const savedEdit = await res.json();
        // 실제 서버 ID로 업데이트
        set(state => ({
          messages: state.messages.map(m => m.id === messageId ? { ...m, id: savedEdit.id } : m)
        }));
        updatedUserMsg.id = savedEdit.id;
      }
    } catch (e) {
      console.error("Failed to edit & truncate message on server:", e);
    }

    // 4. API 페이로드 준비 및 스트림 재요청
    const controller = new AbortController();
    set({ abortController: controller });

    const validHistory = truncatedHistory.filter(m => {
      if (m.role === 'assistant') {
        return m.content && m.content.trim().length > 0;
      }
      return true;
    });

    const formattedMessages = validHistory.map(m => {
      if (m.attachments && m.attachments.length > 0) {
        const contentParts: any[] = [{ type: "text", text: m.content }];
        m.attachments.forEach(att => {
          contentParts.push({
            type: "image_url",
            image_url: { url: att.file_url }
          });
        });
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: m.content };
    });

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const response = await authFetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: currentSessionId,
          messages: formattedMessages,
          enable_thinking: get().enableThinking
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errJson = await response.json().catch(() => ({ detail: { message: '일일 제한 한도를 초과했습니다.' } }));
          const detailMsg = typeof errJson.detail === 'object' ? errJson.detail.message : errJson.detail;
          throw new Error(detailMsg || '한도 초과');
        }
        const errJson = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(errJson.detail || 'Failed to complete chat');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      let streamAssistantContent = '';
      let streamThinkingContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'content') {
              streamAssistantContent += data.delta;
              tokenCount += data.delta.split(/\s+/).length || 1;
            } else if (data.type === 'thinking' || data.type === 'thinking_stream') {
              streamThinkingContent += data.delta;
            } else if (data.type === 'message_id') {
              const elapsedSec = (performance.now() - startTime) / 1000;
              const currentTps = elapsedSec > 0 ? Math.round(tokenCount / elapsedSec) : 0;
              if (typeof window !== 'undefined') {
                localStorage.setItem(`tps_${data.id}`, String(currentTps));
              }
              set(state => ({
                messages: state.messages.map(m =>
                  m.id === assistantMsgTempId ? { ...m, id: data.id, tps: currentTps } : m
                )
              }));
              continue;
            }

            const elapsedSec = (performance.now() - startTime) / 1000;
            const currentTps = elapsedSec > 0 ? Math.round(tokenCount / elapsedSec) : 0;

            set(state => ({
              tps: currentTps,
              messages: state.messages.map(m =>
                m.id === assistantMsgTempId
                  ? {
                      ...m,
                      content: streamAssistantContent,
                      thinking_content: streamThinkingContent,
                      tps: currentTps
                    }
                  : m
              )
            }));
          } catch (e) {
            console.error("Error parsing SSE JSON:", e);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Streaming error:", err);
        set(state => ({
          messages: state.messages.map(m =>
            m.id === assistantMsgTempId
              ? { ...m, content: m.content + `\n\n⚠️ 오류 발생: ${err.message}` }
              : m
          )
        }));
      }
    } finally {
      set(state => ({
        isGenerating: false,
        abortController: null,
        messages: state.messages.map(m =>
          m.role === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m
        )
      }));
    }
  },

  regenerateMessage: async (messageId: string) => {
    const { messages } = get();
    const targetIdx = messages.findIndex(m => m.id === messageId);
    if (targetIdx === -1) return;

    const updatedMessages = messages.slice(0, targetIdx);
    const lastUserMsg = updatedMessages[updatedMessages.length - 1];

    if (lastUserMsg && lastUserMsg.role === 'user') {
      get().editAndResendMessage(lastUserMsg.id, lastUserMsg.content, lastUserMsg.attachments);
    }
  }
}));
