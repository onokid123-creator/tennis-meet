/*
  # Add default value for tennis_style column

  ## Summary
  Sets a default empty string for the tennis_style column in profiles table so that
  upsert operations succeed when switching between dating and tennis purposes without
  explicitly providing a tennis_style value.

  ## Changes
  - profiles.tennis_style: adds DEFAULT '' so upserts don't fail on missing value
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tennis_style'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN tennis_style SET DEFAULT '';
  END IF;
END $$;
