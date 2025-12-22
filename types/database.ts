export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  provider: 'email' | 'google' | 'github';
  provider_account_id: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  modified_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface Checkpoint {
  id: string;
  chat_id: string;
  message_id: string;
  state: Record<string, unknown>;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  settings_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  settings_schema?: Record<string, unknown>;
  created_at: string;
}

export interface ToolSettings {
  id: string;
  user_id: string;
  tool_id: string;
  settings_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModelPreference {
  id: string;
  user_id: string;
  model_id: string;
  is_default: boolean;
  temperature?: number;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  is_available: boolean;
}
