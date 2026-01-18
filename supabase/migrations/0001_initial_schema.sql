-- ============================================================================
-- 0001: Initial Schema
-- ============================================================================
-- Creates core tables for chats, messages, checkpoints, and settings with:
-- - UUID primary keys with gen_random_uuid()
-- - TIMESTAMPTZ for all timestamps
-- - Foreign keys with ON DELETE CASCADE
-- - Basic indexes for performance
-- - Row Level Security enabled (policies in 0002)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Chats table: Stores conversation sessions
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT,
  context TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table: Stores individual chat messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkpoints table: Stores conversation restore points
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings table: Stores user preferences as JSONB
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Chats indexes: Optimize user lookups and sorted queries
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);

-- Messages indexes: Optimize chat and user queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_user ON messages(chat_id, user_id, created_at);

-- Checkpoints indexes: Optimize chat and user queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_chat_id ON checkpoints(chat_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_chat_user ON checkpoints(chat_id, user_id, timestamp);

-- Settings indexes: Optimize user lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
