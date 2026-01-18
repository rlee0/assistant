-- ============================================================================
-- Create Settings Table
-- Stores user preferences and configuration as JSONB
-- Includes complete schema with RLS policies and auto-update trigger
-- ============================================================================

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX
-- ============================================================================

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - SETTINGS
-- ============================================================================

CREATE POLICY "Users can read own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================

-- Automatically update updated_at timestamp on settings changes
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER
-- ============================================================================

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();
