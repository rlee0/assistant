-- ============================================================================
-- 0003: Application Logic
-- ============================================================================
-- Application-specific stored procedures and business logic.
-- All functions use SET search_path = public to prevent search_path hijacking.
-- ============================================================================

-- ============================================================================
-- ACCOUNT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Allows authenticated users to delete their own account and all associated data
-- Uses SECURITY DEFINER to bypass RLS for auth.users deletion
-- CASCADE DELETE automatically removes: chats, messages, checkpoints, settings
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete the user from auth.users
  -- CASCADE DELETE will automatically remove all related data:
  --   - chats (and cascades to messages and checkpoints)
  --   - settings
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION delete_own_account() IS 
'Allows authenticated users to delete their own account and all associated data via CASCADE DELETE. Uses SECURITY DEFINER to elevate privileges for auth.users deletion.';
