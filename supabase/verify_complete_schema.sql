-- ============================================================================
-- Schema Verification Script
-- Run this to verify that all required tables, columns, and security settings exist
-- ============================================================================

-- ============================================================================
-- TABLE EXISTENCE CHECK
-- ============================================================================

SELECT 
  'Tables Exist Check' as check_type,
  CASE 
    WHEN COUNT(*) = 4 THEN '✓ All 4 tables exist (chats, messages, checkpoints, settings)'
    ELSE '✗ Missing tables: Expected 4, found ' || COUNT(*)::text
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('chats', 'messages', 'checkpoints', 'settings');

-- ============================================================================
-- TABLE SCHEMA VERIFICATION
-- ============================================================================

-- Check chats table schema
SELECT 
  'Chats Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chats'
GROUP BY table_schema;

-- Expected: id, user_id, title, model, context, is_pinned, created_at, updated_at

-- Check messages table schema
SELECT 
  'Messages Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages'
GROUP BY table_schema;

-- Expected: id, chat_id, user_id, role, content, created_at

-- Check checkpoints table schema
SELECT 
  'Checkpoints Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'checkpoints'
GROUP BY table_schema;

-- Expected: id, chat_id, user_id, message_index, timestamp, created_at

-- Check settings table schema
SELECT 
  'Settings Table Schema' as check_type,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'settings'
GROUP BY table_schema;

-- Expected: id, user_id, data, created_at, updated_at

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) STATUS
-- ============================================================================

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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

SELECT 
  'RLS Policies' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✓ All 4 policies exist (SELECT, INSERT, UPDATE, DELETE)'
    ELSE '✗ Expected 4 policies, found ' || COUNT(*)::text
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- INDEXES
-- ============================================================================

SELECT 
  'Indexes' as check_type,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tablename, indexname;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT
  'Foreign Keys' as check_type,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('chats', 'messages', 'checkpoints', 'settings')
ORDER BY tc.table_name;

-- Expected: All foreign keys should have delete_rule = 'CASCADE'

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

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

-- ============================================================================
-- FUNCTION SECURITY VERIFICATION
-- ============================================================================

SELECT 
  'Function Security Check' as check_type,
  proname as function_name,
  CASE 
    WHEN prosecdef AND proconfig::text LIKE '%search_path%' THEN '✓ SECURITY DEFINER with search_path = public'
    WHEN prosecdef THEN '⚠ SECURITY DEFINER but search_path not set - SECURITY RISK'
    ELSE '✗ Not SECURITY DEFINER'
  END as security_status
FROM pg_proc
WHERE proname IN ('delete_own_account', 'update_settings_updated_at')
ORDER BY proname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'Verification Summary' as check_type,
  '4 tables, 16 RLS policies, 2 functions, CASCADE DELETE on all FKs' as expected_configuration;
