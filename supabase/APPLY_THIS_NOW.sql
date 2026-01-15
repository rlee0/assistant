-- ============================================================================
-- CRITICAL SECURITY FIX - Apply RLS to prevent users seeing each other's data
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Enable Row Level Security on all tables
-- This is the critical step that was missing!
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can insert own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can update own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can delete own checkpoints" ON checkpoints;

DROP POLICY IF EXISTS "Users can read own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;

DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- STEP 3: Create strict RLS policies for CHATS
CREATE POLICY "Users can read own chats"
  ON chats FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- STEP 4: Create strict RLS policies for MESSAGES
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- STEP 5: Create strict RLS policies for CHECKPOINTS
CREATE POLICY "Users can read own checkpoints"
  ON checkpoints FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own checkpoints"
  ON checkpoints FOR UPDATE
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete own checkpoints"
  ON checkpoints FOR DELETE
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- STEP 6: Verify RLS is now enabled (should all show 't')
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename;

-- STEP 7: Verify policies are created (should show 12 policies total)
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename, policyname;

-- ============================================================================
-- Security is now enabled! Users will only see their own data.
-- ============================================================================
