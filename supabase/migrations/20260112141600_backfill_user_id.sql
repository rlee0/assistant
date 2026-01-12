-- Backfill user_id column from id column for existing records
-- This assumes the existing id column contains the user UUID
UPDATE settings
SET user_id = id
WHERE user_id IS NULL AND id IS NOT NULL;

-- Now enforce the NOT NULL constraint
ALTER TABLE settings
ALTER COLUMN user_id SET NOT NULL;
