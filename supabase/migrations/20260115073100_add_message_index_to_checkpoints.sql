-- Add message_index column to checkpoints table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'message_index'
  ) THEN
    ALTER TABLE checkpoints 
    ADD COLUMN message_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add timestamp column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE checkpoints 
    ADD COLUMN timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Remove NOT NULL constraint from message_id if it exists
-- The application doesn't use message_id, only message_index
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE checkpoints 
    ALTER COLUMN message_id DROP NOT NULL;
  END IF;
END $$;
