-- Check if RLS is ENABLED (this is the critical check!)
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename;

-- Should show:
-- chats        | t
-- checkpoints  | t  
-- messages     | t
--
-- If any show 'f' or no rows, RLS is NOT enabled!
