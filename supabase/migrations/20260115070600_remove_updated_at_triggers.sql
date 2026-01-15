-- Remove triggers that expect updated_at on messages/checkpoints
-- These columns don't exist and aren't needed

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
DROP TRIGGER IF EXISTS checkpoints_updated_at ON checkpoints;
