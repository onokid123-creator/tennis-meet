/*
  # Add owner_photo column to courts table

  1. Changes
    - `courts` table: add `owner_photo` column (text, nullable)
      - Stores the first photo URL of the dating court owner
      - Separate from owner_photos array for easy single-photo access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'owner_photo'
  ) THEN
    ALTER TABLE courts ADD COLUMN owner_photo text;
  END IF;
END $$;
