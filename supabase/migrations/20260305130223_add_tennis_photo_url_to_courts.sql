/*
  # Add tennis_photo_url to courts table

  1. Changes
    - `courts` table: add `tennis_photo_url` column (text, nullable)
      - Stores the tennis-specific profile photo URL used at court creation time
      - Separate from the joined profile's photo_url to allow tennis-specific photos
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'tennis_photo_url'
  ) THEN
    ALTER TABLE courts ADD COLUMN tennis_photo_url text;
  END IF;
END $$;
