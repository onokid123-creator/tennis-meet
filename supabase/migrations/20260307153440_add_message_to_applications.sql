/*
  # Add message column to applications table

  1. Changes
    - `applications` table: add `message` text column to store applicant's intro message
  2. Notes
    - nullable, defaults null (existing rows unaffected)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'message'
  ) THEN
    ALTER TABLE applications ADD COLUMN message text;
  END IF;
END $$;
