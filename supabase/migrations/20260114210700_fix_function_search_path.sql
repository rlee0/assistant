-- Fix function search_path security warnings
-- This migration adds SET search_path to functions to prevent security vulnerabilities
-- References: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix update_settings_updated_at function
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function (if it exists)
-- This function is typically used for auth triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert a new row into public.settings for the new user
  INSERT INTO public.settings (user_id, data)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function (generic trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_chat_modified_at function
CREATE OR REPLACE FUNCTION update_chat_modified_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Note: The auth_leaked_password_protection warning must be fixed in the Supabase dashboard:
-- Navigate to: Authentication > Providers > Email > Password Requirements
-- Enable "Check password against known data breaches"
