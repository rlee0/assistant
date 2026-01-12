-- Update settings table schema to use user_id column
-- This migration fixes the table structure to properly link settings to users

-- Add user_id column if it doesn't exist
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Add NOT NULL constraint if the column is empty (only if table is empty)
ALTER TABLE settings
ADD CONSTRAINT settings_user_id_not_null CHECK (user_id IS NOT NULL);

-- Add foreign key constraint if it doesn't exist
ALTER TABLE settings
ADD CONSTRAINT settings_user_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Update RLS policies to use user_id instead of id
DROP POLICY IF EXISTS "Users can read own settings" ON settings;
CREATE POLICY "Users can read own settings"
  ON settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
CREATE POLICY "Users can insert own settings"
  ON settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON settings;
CREATE POLICY "Users can update own settings"
  ON settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
CREATE POLICY "Users can delete own settings"
  ON settings
  FOR DELETE
  USING (auth.uid() = user_id);
