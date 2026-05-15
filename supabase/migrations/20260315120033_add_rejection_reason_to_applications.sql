/*
  # Add rejection_reason to applications table

  ## Summary
  Adds a `rejection_reason` text column to the `applications` table so that
  hosts can provide a reason when rejecting an applicant's request.

  ## Changes
  - `applications` table: adds `rejection_reason text` column (nullable)

  ## Notes
  - Existing rows receive NULL as default (no reason given)
  - No RLS changes required; existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE applications ADD COLUMN rejection_reason text;
  END IF;
END $$;
