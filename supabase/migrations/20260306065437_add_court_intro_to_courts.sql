/*
  # Add court_intro column to courts table

  1. Changes
    - `courts` table: add `court_intro` column (text, nullable)
      - Stores the one-line introduction entered when registering a dating court
      - Completely separate from `owner_bio` which comes from the profile's bio field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'court_intro'
  ) THEN
    ALTER TABLE courts ADD COLUMN court_intro text;
  END IF;
END $$;
