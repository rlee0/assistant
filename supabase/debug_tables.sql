-- Check if tables exist at all
SELECT 
  table_schema,
  table_name
FROM information_schema.tables 
WHERE table_name IN ('chats', 'messages', 'checkpoints')
ORDER BY table_schema, table_name;

-- Check what schema they're in
SELECT 
  schemaname, 
  tablename
FROM pg_tables 
WHERE tablename LIKE '%chat%' OR tablename LIKE '%message%' OR tablename LIKE '%checkpoint%'
ORDER BY schemaname, tablename;
