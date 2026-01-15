-- ============================================================================
-- Add function to allow users to delete their own account
-- Uses SECURITY DEFINER to bypass RLS and delete from auth.users
-- ============================================================================

-- Create a function that allows users to delete their own account
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
  -- This will cascade to all related tables (chats, messages, checkpoints, settings)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_own_account() IS 
'Allows authenticated users to delete their own account and all associated data via CASCADE DELETE';
