-- ============================================================================
-- Check and Fix Specific User
-- User ID: 9fd46653-2d38-43b0-acfd-01511c1eb500
-- ============================================================================

-- 1. Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE id = '9fd46653-2d38-43b0-acfd-01511c1eb500';

-- 2. Check if profile exists
SELECT * FROM public.profiles
WHERE id = '9fd46653-2d38-43b0-acfd-01511c1eb500';

-- 3. If profile doesn't exist, create it
-- Run this ONLY if the user exists in auth.users but not in profiles
INSERT INTO public.profiles (
  id,
  name,
  email,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)),
  u.email,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = '9fd46653-2d38-43b0-acfd-01511c1eb500'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );

-- 4. Verify the profile was created
SELECT 
  p.id,
  p.name,
  p.email,
  p.created_at,
  'Profile exists' as status
FROM public.profiles p
WHERE p.id = '9fd46653-2d38-43b0-acfd-01511c1eb500';

-- 5. If user doesn't exist in auth.users at all, check email
-- (User might exist with different ID)
SELECT 
  id,
  email,
  email_confirmed_at,
  'Found by email' as note
FROM auth.users
WHERE email LIKE '%zhou.wenbin%'
   OR email LIKE '%x2@gmail%';

-- 6. Grant necessary permissions (if needed)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;



