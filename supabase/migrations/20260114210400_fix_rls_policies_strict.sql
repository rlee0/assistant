-- Drop and recreate RLS policies to be strict about NULL user_id values

-- Checkpoints policies
DROP POLICY IF EXISTS "Users can read own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can insert own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can update own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can delete own checkpoints" ON checkpoints;

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

-- Chats policies
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;

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

-- Messages policies
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

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

-- Delete all orphaned data (records without user_id)
-- This ensures no data leaks between users
DELETE FROM checkpoints WHERE user_id IS NULL;
DELETE FROM messages WHERE user_id IS NULL;
DELETE FROM chats WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent future issues
ALTER TABLE checkpoints ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
