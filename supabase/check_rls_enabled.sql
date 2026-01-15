-- Quick check: Is RLS actually ENABLED?
-- Run this in Supabase SQL Editor
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'checkpoints')
ORDER BY tablename;

-- If any show 'f' (false), RLS is NOT enabled - run these:
-- ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
