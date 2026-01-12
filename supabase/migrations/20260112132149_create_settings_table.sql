-- Create settings table for storing user preferences
-- This table stores user settings as JSONB for flexibility

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Users can read own settings'
  ) THEN
    CREATE POLICY "Users can read own settings"
      ON settings
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can insert their own settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Users can insert own settings'
  ) THEN
    CREATE POLICY "Users can insert own settings"
      ON settings
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can update their own settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Users can update own settings'
  ) THEN
    CREATE POLICY "Users can update own settings"
      ON settings
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can delete their own settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Users can delete own settings'
  ) THEN
    CREATE POLICY "Users can delete own settings"
      ON settings
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();
