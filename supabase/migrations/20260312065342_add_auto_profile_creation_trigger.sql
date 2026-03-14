/*
  # Auto Profile Creation on Signup

  ## Summary
  Creates a PostgreSQL trigger that automatically inserts a row into `public.profiles`
  whenever a new user is created in `auth.users`. This ensures profile records always
  exist immediately after signup, preventing the loading loop caused by missing profiles.

  ## Changes
  - New function: `handle_new_user()` — reads name/age/gender from auth metadata and inserts a profile row
  - New trigger: `on_auth_user_created` — fires AFTER INSERT on auth.users

  ## Notes
  - Uses SECURITY DEFINER so it can bypass RLS and write to profiles on behalf of the new user
  - Falls back to empty string for name if not provided in metadata
  - profile_completed defaults to false
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, age, gender, profile_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE
      WHEN (NEW.raw_user_meta_data->>'age') IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'age')::integer
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'gender', NULL),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
