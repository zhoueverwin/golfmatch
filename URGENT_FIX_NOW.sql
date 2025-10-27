-- ============================================================================
-- URGENT FIX: Create Missing Profile
-- Copy this ENTIRE file and run in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check if user exists in auth.users
DO $$
DECLARE
  v_email TEXT;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = '9fd46653-2d38-43b0-acfd-01511c1eb500';
  
  IF v_email IS NOT NULL THEN
    RAISE NOTICE '✅ User found in auth.users: %', v_email;
    v_user_exists := TRUE;
  ELSE
    RAISE NOTICE '❌ User NOT found in auth.users!';
    v_user_exists := FALSE;
  END IF;
END $$;

-- Step 2: Create the profile (if user exists)
INSERT INTO public.profiles (
  id,
  name,
  email,
  created_at,
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)) as name,
  u.email,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = '9fd46653-2d38-43b0-acfd-01511c1eb500'
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, profiles.name),
  email = COALESCE(EXCLUDED.email, profiles.email),
  updated_at = NOW();

-- Step 3: Verify the profile was created
DO $$
DECLARE
  v_profile_count INTEGER;
  v_profile_name TEXT;
  v_profile_email TEXT;
BEGIN
  SELECT COUNT(*), MAX(name), MAX(email) 
  INTO v_profile_count, v_profile_name, v_profile_email
  FROM public.profiles
  WHERE id = '9fd46653-2d38-43b0-acfd-01511c1eb500';
  
  IF v_profile_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS! Profile created:';
    RAISE NOTICE '   Name: %', v_profile_name;
    RAISE NOTICE '   Email: %', v_profile_email;
  ELSE
    RAISE NOTICE '❌ FAILED! Profile was not created';
    RAISE NOTICE 'Please check:';
    RAISE NOTICE '1. User exists in auth.users';
    RAISE NOTICE '2. RLS policies allow INSERT';
    RAISE NOTICE '3. No foreign key violations';
  END IF;
END $$;

-- Step 4: Show the profile data
SELECT 
  id,
  name,
  email,
  created_at,
  'Profile ready ✅' as status
FROM public.profiles
WHERE id = '9fd46653-2d38-43b0-acfd-01511c1eb500';

-- Step 5: Create trigger for future users (prevents this issue)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Fix ALL existing users without profiles
INSERT INTO public.profiles (id, name, email, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)),
  u.email,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Final verification
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- ============================================================================
-- DONE! Check the results above.
-- Then go to your app and:
-- 1. Settings → Sign Out
-- 2. Sign in again with your email and password
-- 3. ✅ Pages should now show data!
-- ============================================================================



