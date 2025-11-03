-- Migration: Free Membership for Female Users
-- This migration updates the check_active_membership function to grant free access to female users
-- and cancels all existing active memberships for female users

-- ============================================================================
-- Step 1: Update check_active_membership RPC function to check user gender
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_active_membership(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_gender TEXT;
  profile_id UUID;
BEGIN
  -- First, find the profile by checking multiple ID fields
  SELECT id, gender INTO profile_id, user_gender
  FROM public.profiles
  WHERE id = p_user_id OR legacy_id = p_user_id::TEXT OR user_id = p_user_id::TEXT
  LIMIT 1;

  -- If user is female, grant free access immediately
  IF user_gender = 'female' THEN
    RETURN TRUE;
  END IF;

  -- For male and other genders, check membership status as before
  -- Check membership by UUID (id) or TEXT (legacy_id/user_id)
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE (user_id = profile_id OR user_id::TEXT IN (
      SELECT legacy_id FROM public.profiles WHERE id = profile_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = profile_id
    ))
      AND is_active = true
      AND (expiration_date IS NULL OR expiration_date > NOW())
  );
END;
$$;

-- ============================================================================
-- Step 2: Cancel all existing active memberships for female users
-- ============================================================================
UPDATE public.memberships
SET is_active = false,
    expiration_date = CASE 
      WHEN plan_type = 'basic' THEN NOW()
      ELSE expiration_date
    END
WHERE is_active = true
  AND (
    user_id::TEXT IN (SELECT id::TEXT FROM public.profiles WHERE gender = 'female')
    OR user_id::TEXT IN (SELECT legacy_id FROM public.profiles WHERE gender = 'female')
    OR user_id::TEXT IN (SELECT user_id FROM public.profiles WHERE gender = 'female')
  );

-- Add comment to document the change
COMMENT ON FUNCTION public.check_active_membership(UUID) IS 
'Checks if user has active membership. Female users automatically get free access.';

