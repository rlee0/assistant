-- ============================================================================
-- Database Schema Reference
-- This file provides a complete reference for the database schema
-- ⚠️ DO NOT run this directly - use migrations in migrations/ folder instead
-- ============================================================================
--
-- This is a reference document showing the complete final state of the database
-- after all migrations have been applied. Use this for:
-- - Understanding the complete schema structure
-- - Reviewing table relationships and constraints
-- - Reference when writing queries or API code
--
-- To set up the database, use the migration files in migrations/ folder.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- chats: Stores conversation sessions
-- - CASCADE DELETE from auth.users removes all user's chats and their messages/checkpoints
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT,  -- AI model used for this chat (e.g., 'gpt-4', 'claude-3')
  context TEXT,  -- Conversation context/system prompt
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
  content TEXT NOT NULL,  -- Can be plain text or JSON string
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
  data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Flexible JSON storage for all settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Chats indexes - optimize user lookups and sorted queries
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at DESC);

-- Messages indexes - optimize chat and user queries
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_chat_user ON messages(chat_id, user_id, created_at);

-- Checkpoints indexes - optimize chat and user queries
CREATE INDEX idx_checkpoints_chat_id ON checkpoints(chat_id);
CREATE INDEX idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX idx_checkpoints_chat_user ON checkpoints(chat_id, user_id, timestamp);

-- Settings indexes - optimize user lookups
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- update_settings_updated_at: Automatically updates updated_at timestamp on settings changes
-- - Trigger function for settings table
-- - Uses SECURITY DEFINER with SET search_path for security
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger that fires the update function
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- delete_own_account: Allows authenticated users to delete their own account
-- - Uses SECURITY DEFINER to elevate privileges for auth.users deletion
-- - Uses SET search_path = public to prevent SQL injection attacks
-- - Validates authentication before deletion
-- - CASCADE DELETE automatically removes all related data
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- All tables have RLS enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - CHATS
-- ============================================================================

CREATE POLICY "Users can read own chats" ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON chats FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - MESSAGES
-- ============================================================================

CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - CHECKPOINTS
-- ============================================================================

CREATE POLICY "Users can read own checkpoints" ON checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkpoints" ON checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkpoints" ON checkpoints FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkpoints" ON checkpoints FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - SETTINGS
-- ============================================================================

-- Settings policies (4 policies: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can read own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (auth.uid() = user_id);
