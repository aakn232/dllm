export interface Attachment {
  id?: string;
  file_type: string;
  file_url: string; // base64 or URL
}

export interface ChatMessage {
  id: string;
  session_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking_content?: string | null;
  attachments?: Attachment[];
  created_at?: string;
  isStreaming?: boolean;
  tps?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface CustomInstruction {
  user_id: string;
  user_profile: string;
  response_style: string;
  is_enabled: boolean;
  updated_at?: string;
}

export interface CustomInstructionPreset {
  label: string;
  description: string;
  user_profile: string;
  response_style: string;
}

// Vite runtime ES module 번들링 방지용 런타임 엑스포트 제공
export const TYPE_MARKER = 'CHAT_TYPES';

