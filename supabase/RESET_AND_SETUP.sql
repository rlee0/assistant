-- ============================================================================
-- COMPLETE DATABASE RESET AND SETUP
-- ⚠️ WARNING: This will DELETE ALL DATA and recreate tables from scratch
-- Only use for development/testing, NEVER in production!
-- ============================================================================
-- 
-- This script provides a quick way to reset your development database to a
-- clean state. It drops all tables and recreates them with the complete schema.
-- 
-- Use this when:
-- - Setting up a new development environment
-- - Fixing schema inconsistencies in development
-- - Testing fresh installations
-- 
-- ⚠️ DO NOT USE IN PRODUCTION - ALL DATA WILL BE LOST
-- ============================================================================

-- ============================================================================
-- DROP EXISTING TABLES
-- ============================================================================

DROP TABLE IF EXISTS checkpoints CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS delete_own_account() CASCADE;
DROP FUNCTION IF EXISTS update_settings_updated_at() CASCADE;

-- ============================================================================
-- RECREATE TABLES WITH COMPLETE SCHEMA
-- ============================================================================

-- Create chats table with all required columns
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

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create checkpoints table
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES - CHATS
-- ============================================================================

CREATE POLICY "Users can read own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE RLS POLICIES - MESSAGES
-- ============================================================================

CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE RLS POLICIES - CHECKPOINTS
-- ============================================================================

CREATE POLICY "Users can read own checkpoints"
  ON checkpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkpoints"
  ON checkpoints FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkpoints"
  ON checkpoints FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE RLS POLICIES - SETTINGS
-- ============================================================================

CREATE POLICY "Users can read own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);

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
-- TRIGGER FUNCTION AND TRIGGER
-- ============================================================================

-- Function to automatically update settings.updated_at timestamp
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

-- Trigger for settings table
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- ACCOUNT DELETION FUNCTION
-- ============================================================================

-- Function to allow users to delete their own account
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete the user from auth.users
  -- CASCADE DELETE automatically removes: chats, messages, checkpoints, settings
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- Add documentation
COMMENT ON FUNCTION delete_own_account() IS 
'Allows authenticated users to delete their own account and all associated data via CASCADE DELETE. Uses SECURITY DEFINER to elevate privileges for auth.users deletion.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables were created
SELECT 
  '✓ Tables Created' as status,
  COUNT(*) as table_count,
  'Expected: 4' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('chats', 'messages', 'checkpoints', 'settings');

-- Verify RLS is enabled
SELECT 
  '✓ RLS Enabled' as status,
  tablename,
  rowsecurity as enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tablename;

-- Verify policies were created
SELECT 
  '✓ RLS Policies Created' as status,
  tablename,
  COUNT(*) as policy_count,
  '4 expected per table' as expected
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
GROUP BY tablename
ORDER BY tablename;

-- Verify functions exist
SELECT 
  '✓ Functions Created' as status,
  COUNT(*) as function_count,
  'Expected: 2' as expected
FROM pg_proc
WHERE proname IN ('delete_own_account', 'update_settings_updated_at');

-- ============================================================================
-- COMPLETE! Database is ready for use.
-- Run verify_complete_schema.sql for comprehensive verification.
-- ============================================================================
