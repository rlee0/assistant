-- ============================================================================
-- Add missing columns to chats table
-- Adds model and context columns that the app requires
-- ============================================================================

-- Add model column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' AND column_name = 'model'
  ) THEN
    ALTER TABLE chats 
    ADD COLUMN model TEXT;
    
    RAISE NOTICE 'Added model column to chats table';
  ELSE
    RAISE NOTICE 'model column already exists in chats table';
  END IF;
END $$;

-- Add context column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' AND column_name = 'context'
  ) THEN
    ALTER TABLE chats 
    ADD COLUMN context TEXT;
    
    RAISE NOTICE 'Added context column to chats table';
  ELSE
    RAISE NOTICE 'context column already exists in chats table';
  END IF;
END $$;
