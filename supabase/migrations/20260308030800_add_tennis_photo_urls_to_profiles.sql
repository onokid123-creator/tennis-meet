/*
  # Add tennis_photo_urls to profiles

  1. Changes
    - Adds `tennis_photo_urls` column (text[]) to profiles table
      - Stores tennis-specific profile photos separately from dating photos
      - Dating photos continue to use `photo_urls`
      - Tennis photos use `tennis_photo_urls`
      - Both fields are independent and never mixed

  2. Notes
    - Existing data is preserved
    - Column defaults to NULL (no tennis photos)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tennis_photo_urls'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tennis_photo_urls text[];
  END IF;
END $$;
