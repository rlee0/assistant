-- ============================================================================
-- Database Schema Overview
-- This file provides a reference for the complete database schema
-- DO NOT run this directly - use migrations in migrations/ folder instead
-- ============================================================================

-- TABLES
-- ======

-- chats: Stores conversation sessions
-- - CASCADE DELETE from auth.users removes all user's chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT,
  context TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages: Stores individual chat messages
-- - CASCADE DELETE from chats and auth.users
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- checkpoints: Stores conversation restore points
-- - CASCADE DELETE from chats and auth.users
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- settings: Stores user preferences and configuration
-- - CASCADE DELETE from auth.users
-- - UNIQUE constraint on user_id (one settings row per user)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
-- =======

-- Chats indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_chat_user ON messages(chat_id, user_id, created_at);

-- Checkpoints indexes
CREATE INDEX idx_checkpoints_chat_id ON checkpoints(chat_id);
CREATE INDEX idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX idx_checkpoints_chat_user ON checkpoints(chat_id, user_id, timestamp);

-- FUNCTIONS
-- =========

-- delete_own_account: Allows authenticated users to delete their own account
-- Uses SECURITY DEFINER to elevate privileges for this specific operation
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- ROW LEVEL SECURITY (RLS)
-- ========================

-- All tables have RLS enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Chats policies (4 policies: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can read own chats" ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON chats FOR DELETE USING (auth.uid() = user_id);

-- Messages policies (4 policies: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

-- Checkpoints policies (4 policies: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can read own checkpoints" ON checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkpoints" ON checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkpoints" ON checkpoints FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkpoints" ON checkpoints FOR DELETE USING (auth.uid() = user_id);

-- Settings policies (4 policies: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can read own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (auth.uid() = user_id);
