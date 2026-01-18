-- ============================================================================
-- 0002: Security and Triggers
-- ============================================================================
-- Creates Row Level Security policies and automatic timestamp triggers.
-- All functions use SET search_path = public to prevent search_path hijacking.
-- ============================================================================

-- ============================================================================
-- RLS POLICIES - CHATS
-- ============================================================================

CREATE POLICY "Users can read own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - MESSAGES
-- ============================================================================

CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - CHECKPOINTS
-- ============================================================================

CREATE POLICY "Users can read own checkpoints"
  ON checkpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkpoints"
  ON checkpoints FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkpoints"
  ON checkpoints FOR DELETE
  USING (auth.uid() = user_id);

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
-- TRIGGER FUNCTIONS
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
-- TRIGGERS
-- ============================================================================

-- Trigger for automatic settings timestamp updates
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_settings_updated_at() IS 
'Automatically updates the updated_at timestamp when settings are modified. Uses SECURITY DEFINER with SET search_path = public for security.';
