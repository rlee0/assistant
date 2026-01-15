-- ============================================================================
-- DELETE INSECURE DUPLICATE POLICIES
-- This removes the old policies that are allowing the data leak
-- ============================================================================

-- Remove OLD insecure policies for CHATS
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can create own chats" ON chats;

-- Remove OLD insecure policies for CHECKPOINTS  
DROP POLICY IF EXISTS "Users can view own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can create own checkpoints" ON checkpoints;

-- Remove OLD insecure policies for MESSAGES
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;

-- ============================================================================
-- Verify only secure policies remain (should show 12 total)
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename, policyname;

-- Should ONLY show these policies:
-- - Users can delete own [table]
-- - Users can insert own [table]  
-- - Users can read own [table]
-- - Users can update own [table]
--
-- The old "view" and "create" policies should be GONE!
