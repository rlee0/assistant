-- ============================================================================
-- Schema Verification Script
-- Run this to verify that all required columns and tables exist
-- ============================================================================

-- Check that all tables exist
SELECT 
  'Tables Exist Check' as check_type,
  CASE 
    WHEN COUNT(*) = 3 THEN '✓ All tables exist'
    ELSE '✗ Missing tables: ' || (3 - COUNT(*)::text)
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('chats', 'messages', 'checkpoints');

-- Check chats table schema
SELECT 
  'Chats Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chats'
GROUP BY table_schema;

-- Expected columns for chats: id, user_id, title, model, context, is_pinned, created_at, updated_at

-- Check messages table schema
SELECT 
  'Messages Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages'
GROUP BY table_schema;

-- Expected columns for messages: id, chat_id, user_id, role, content, created_at

-- Check checkpoints table schema
SELECT 
  'Checkpoints Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'checkpoints'
GROUP BY table_schema;

-- Expected columns for checkpoints: id, chat_id, user_id, message_index, timestamp, created_at

-- Check RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tablename;

-- Check policies exist
SELECT 
  'RLS Policies' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✓ All policies exist'
    ELSE '✗ Missing policies'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
GROUP BY tablename
ORDER BY tablename;

-- Check indexes
SELECT 
  'Indexes' as check_type,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tablename, indexname;

-- Check foreign key constraints
SELECT
  'Foreign Keys' as check_type,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tc.table_name;

-- Check functions exist
SELECT 
  'Functions Check' as check_type,
  proname as function_name,
  CASE 
    WHEN proname = 'delete_own_account' THEN '✓ Account deletion function exists'
    WHEN proname = 'update_settings_updated_at' THEN '✓ Settings timestamp trigger exists'
    ELSE '✓ Function exists'
  END as status
FROM pg_proc
WHERE proname IN ('delete_own_account', 'update_settings_updated_at')
ORDER BY proname;

-- Verify functions have secure search_path
SELECT 
  'Function Security Check' as check_type,
  proname as function_name,
  CASE 
    WHEN prosecdef AND proconfig::text LIKE '%search_path%' THEN '✓ SECURITY DEFINER with search_path set'
    WHEN prosecdef THEN '⚠ SECURITY DEFINER but search_path not set'
    ELSE '✗ Not SECURITY DEFINER'
  END as security_status
FROM pg_proc
WHERE proname IN ('delete_own_account', 'update_settings_updated_at')
ORDER BY proname;
