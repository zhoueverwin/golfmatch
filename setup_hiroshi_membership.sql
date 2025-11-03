-- Test User Membership Setup
-- Creates a permanent plan membership for Hiroshi (test user)

-- Hiroshi's user ID
-- Email: hiroshi@test.com
-- Profile ID: 1b05870e-ff52-432e-a1e5-efb3282ca2de

-- First, check if Hiroshi exists
DO $$
DECLARE
  v_hiroshi_id UUID := '1b05870e-ff52-432e-a1e5-efb3282ca2de';
  v_hiroshi_exists BOOLEAN;
BEGIN
  -- Check if Hiroshi exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_hiroshi_id) INTO v_hiroshi_exists;
  
  IF NOT v_hiroshi_exists THEN
    RAISE NOTICE 'Warning: Hiroshi user not found with ID: %', v_hiroshi_id;
    RAISE NOTICE 'Please ensure Hiroshi profile exists before creating membership';
  ELSE
    RAISE NOTICE 'Hiroshi found: %', v_hiroshi_id;
  END IF;
END $$;

-- Delete any existing inactive memberships for Hiroshi (cleanup)
DELETE FROM memberships 
WHERE user_id = '1b05870e-ff52-432e-a1e5-efb3282ca2de'::uuid
  AND is_active = false;

-- Create permanent plan membership for Hiroshi
INSERT INTO memberships (
  user_id,
  plan_type,
  price,
  purchase_date,
  expiration_date,
  is_active,
  store_transaction_id,
  platform,
  created_at,
  updated_at
) VALUES (
  '1b05870e-ff52-432e-a1e5-efb3282ca2de'::uuid,
  'permanent',
  10000,
  NOW(),
  NULL, -- Permanent plan has no expiration
  true,
  'test_membership_hiroshi_' || extract(epoch from now())::text,
  'ios',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify the membership was created
DO $$
DECLARE
  v_membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_membership_count
  FROM memberships m
  JOIN profiles p ON m.user_id = p.id
  WHERE m.user_id = '1b05870e-ff52-432e-a1e5-efb3282ca2de'::uuid
    AND m.is_active = true;
  
  IF v_membership_count > 0 THEN
    RAISE NOTICE '✅ Hiroshi membership setup complete!';
    RAISE NOTICE 'User: Hiroshi (1b05870e-ff52-432e-a1e5-efb3282ca2de)';
    RAISE NOTICE 'Plan: Permanent (¥10,000)';
    RAISE NOTICE 'Status: Active';
  ELSE
    RAISE WARNING '⚠️ Membership not found after creation';
  END IF;
END $$;

-- View the membership details
SELECT 
  m.id,
  m.user_id,
  p.name as user_name,
  m.plan_type,
  m.price,
  m.is_active,
  m.purchase_date,
  m.expiration_date,
  m.store_transaction_id,
  m.platform
FROM memberships m
JOIN profiles p ON m.user_id = p.id
WHERE m.user_id = '1b05870e-ff52-432e-a1e5-efb3282ca2de'::uuid
  AND m.is_active = true;

