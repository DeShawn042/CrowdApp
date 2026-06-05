-- ============================================================
-- Migration 006: Fix profiles table & handle_new_user trigger
--
-- Run this in Supabase → SQL Editor
--
-- Problem: "Database error saving new user" on signup.
-- Cause:   The handle_new_user trigger inserts into profiles
--          but doesn't include is_admin, which either has no
--          DEFAULT or was added after the trigger was written.
-- ============================================================

-- 1. Ensure profiles table exists with all required columns
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  email      text,
  is_admin   boolean     NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Ensure is_admin has a DEFAULT so it can never be NULL on insert
ALTER TABLE profiles
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN is_admin SET NOT NULL;

-- 3. Add any missing columns safely
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin   boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 4. Drop and recreate the trigger function with all columns accounted for
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    name  = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- 5. Re-attach the trigger (drop first so it's idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS — allow users to read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow the trigger (running as SECURITY DEFINER) to insert
DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 7. Backfill profiles for any existing auth users missing a row
INSERT INTO public.profiles (id, name, email, is_admin)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
