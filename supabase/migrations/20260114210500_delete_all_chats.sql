-- Delete all chats (cascades to messages and checkpoints)
DELETE FROM chats;

-- Verify deletion
SELECT 'chats' as table_name, COUNT(*) as remaining FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'checkpoints', COUNT(*) FROM checkpoints;
