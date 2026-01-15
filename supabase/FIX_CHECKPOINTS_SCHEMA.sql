-- ============================================================================
-- FIX: Add missing message_index column to checkpoints table
-- Run this in Supabase SQL Editor to fix the schema error
-- ============================================================================

-- Add message_index column to checkpoints table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'message_index'
  ) THEN
    ALTER TABLE checkpoints 
    ADD COLUMN message_index INTEGER NOT NULL DEFAULT 0;
    
    RAISE NOTICE 'Added message_index column to checkpoints table';
  ELSE
    RAISE NOTICE 'message_index column already exists in checkpoints table';
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
    
    RAISE NOTICE 'Added timestamp column to checkpoints table';
  ELSE
    RAISE NOTICE 'timestamp column already exists in checkpoints table';
  END IF;
END $$;

-- Remove NOT NULL constraint from message_id if it exists (it's not used by the application)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE checkpoints 
    ALTER COLUMN message_id DROP NOT NULL;
    
    RAISE NOTICE 'Removed NOT NULL constraint from message_id column';
  ELSE
    RAISE NOTICE 'message_id column does not exist in checkpoints table';
  END IF;
END $$;

-- Verify the columns were added
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'checkpoints'
  AND column_name IN ('message_index', 'timestamp', 'message_id')
ORDER BY column_name;

-- ============================================================================
-- The schema error should now be fixed!
-- ============================================================================
