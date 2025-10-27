-- ============================================================================
-- Authentication Fixes
-- ============================================================================

-- 1. Create a function to automatically create a profile when a user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the user with default values
  INSERT INTO public.profiles (
    id,
    name,
    email,
    age,
    gender,
    golf_experience,
    location,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)), -- Use email username as default name
    NEW.email,
    NULL, -- age will be set later by user
    NULL, -- gender will be set later by user
    NULL, -- golf_experience will be set later by user  
    NULL, -- location will be set later by user
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger to call the function when a new user signs up
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 4. Update RLS policies to ensure users can read their own profile
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to view other profiles (for matching)
CREATE POLICY "Users can view other profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 5. Create a function to handle existing users without profiles
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all auth users who don't have a profile
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- Create a profile for each user
    INSERT INTO public.profiles (
      id,
      name,
      email,
      created_at,
      updated_at
    )
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'name', SPLIT_PART(user_record.email, '@', 1)),
      user_record.email,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Created profiles for % existing users', (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles));
END $$;

-- 6. Verify the setup
-- ============================================================================

SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as users_with_profiles
FROM auth.users;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up via Supabase Auth';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers profile creation for new users';



