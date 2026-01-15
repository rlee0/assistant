-- Verification Script - Run this in Supabase SQL Editor
-- This will show you the current state of your tables and RLS

-- 1. Check if RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tablename;

-- 2. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check table structures (including user_id column)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('chats', 'messages', 'checkpoints')
  AND column_name IN ('id', 'user_id', 'chat_id')
ORDER BY table_name, column_name;

-- 4. Count records with and without user_id
SELECT 'chats' as table_name,
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
       COUNT(*) FILTER (WHERE user_id IS NULL) as without_user_id,
       COUNT(*) as total
FROM chats
UNION ALL
SELECT 'messages',
       COUNT(*) FILTER (WHERE user_id IS NOT NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*)
FROM messages
UNION ALL
SELECT 'checkpoints',
       COUNT(*) FILTER (WHERE user_id IS NOT NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*)
FROM checkpoints;

-- 5. Get list of users to assign data to
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;
