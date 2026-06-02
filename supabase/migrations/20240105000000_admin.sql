-- Add is_admin to profiles table
-- Run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
-- Then grant yourself admin:
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR-USER-UUID-HERE';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Allow authenticated users to read their own is_admin status
-- (profiles table should already have RLS; this policy covers the new column)
