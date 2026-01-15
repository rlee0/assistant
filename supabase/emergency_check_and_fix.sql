-- EMERGENCY: Run this IMMEDIATELY in Supabase SQL Editor
-- This will check and fix the security issue

-- STEP 1: Verify RLS is ENABLED on all tables
-- If any of these return 'f' (false), it's a critical security issue!
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename;

-- STEP 2: Enable RLS if not already enabled (RUN THIS!)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- STEP 3: Check for data without user_id (SECURITY LEAK!)
SELECT 
  'chats' as table_name,
  COUNT(*) as records_without_user_id
FROM chats WHERE user_id IS NULL
UNION ALL
SELECT 
  'messages',
  COUNT(*)
FROM messages WHERE user_id IS NULL
UNION ALL
SELECT 
  'checkpoints',
  COUNT(*)
FROM checkpoints WHERE user_id IS NULL;

-- STEP 4: List all users (to assign orphaned data)
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;

-- STEP 5: MANUAL ACTION - Assign orphaned records to the correct user
-- Replace 'YOUR_USER_ID_HERE' with the correct user ID from STEP 4
-- IMPORTANT: Only uncomment and run if you know which user owns this data!

-- UPDATE chats SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE messages SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE checkpoints SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- STEP 6: After fixing, verify policies are working
-- This should return the same results as STEP 3 (all zeros)
SELECT 
  'chats' as table_name,
  COUNT(*) as records_without_user_id
FROM chats WHERE user_id IS NULL
UNION ALL
SELECT 
  'messages',
  COUNT(*)
FROM messages WHERE user_id IS NULL
UNION ALL
SELECT 
  'checkpoints',
  COUNT(*)
FROM checkpoints WHERE user_id IS NULL;

-- STEP 7: Make user_id NOT NULL to prevent future issues (after fixing data)
-- Uncomment after all data has user_id assigned:
-- ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE checkpoints ALTER COLUMN user_id SET NOT NULL;
