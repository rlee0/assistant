-- Backfill user_id for existing records
-- This migration attempts to assign existing data to users

-- For checkpoints, get user_id from the related chat
UPDATE checkpoints
SET user_id = chats.user_id
FROM chats
WHERE checkpoints.chat_id = chats.id
  AND checkpoints.user_id IS NULL
  AND chats.user_id IS NOT NULL;

-- For messages, get user_id from the related chat
UPDATE messages
SET user_id = chats.user_id
FROM chats
WHERE messages.chat_id = chats.id
  AND messages.user_id IS NULL
  AND chats.user_id IS NOT NULL;

-- Make user_id columns NOT NULL after backfilling
-- Only if there are no remaining NULL values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM checkpoints WHERE user_id IS NULL) THEN
    ALTER TABLE checkpoints ALTER COLUMN user_id SET NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM chats WHERE user_id IS NULL) THEN
    ALTER TABLE chats ALTER COLUMN user_id SET NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM messages WHERE user_id IS NULL) THEN
    ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;
