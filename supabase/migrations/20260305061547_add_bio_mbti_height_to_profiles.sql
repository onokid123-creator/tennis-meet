/*
  # Add bio, mbti, height columns to profiles

  1. Changes
    - `profiles` table: add `bio` (text), `mbti` (text), `height` (integer) columns
  2. Notes
    - All nullable, no defaults required
    - Existing rows unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mbti'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mbti text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'height'
  ) THEN
    ALTER TABLE profiles ADD COLUMN height integer;
  END IF;
END $$;
