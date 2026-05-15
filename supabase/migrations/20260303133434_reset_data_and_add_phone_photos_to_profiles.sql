/*
  # Reset data and upgrade profiles schema

  ## Changes
  1. Delete all records from messages, chats, applications, courts, profiles (in dependency order)
  2. Add phone_number column (text, unique) to profiles
  3. Add photos jsonb column to profiles for storing up to 5 photo URLs

  ## Notes
  - Auth users must be deleted separately via Supabase dashboard or Auth API
  - phone_number is stored as text to preserve leading zeros and international format
  - photos is a JSONB array of URL strings, ordered by user preference
*/

DELETE FROM messages;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photos'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'profiles_phone_number_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_phone_number_key ON profiles(phone_number) WHERE phone_number IS NOT NULL;
  END IF;
END $$;
