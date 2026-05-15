/*
  # Add purpose to applications & update related RLS

  ## Changes

  1. `applications` table
     - Add `purpose` column ('tennis' | 'dating') to distinguish application types
     - Backfill existing rows with 'dating' as default (previous behavior)

  2. `courts` table
     - Add `total_slots` computed helper: not a column, but confirm existing
       `confirmed_male_slots` and `confirmed_female_slots` columns exist

  3. RLS: applications INSERT policy needs to allow applicant to insert with purpose

  ## Notes
  - Tennis applications go through applications table (pending -> accepted creates chat)
  - Dating applications same flow
  - No destructive changes
*/

-- Add purpose column to applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE applications ADD COLUMN purpose text NOT NULL DEFAULT 'dating';
  END IF;
END $$;

-- Ensure confirmed slot columns exist on courts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'confirmed_male_slots'
  ) THEN
    ALTER TABLE courts ADD COLUMN confirmed_male_slots integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'confirmed_female_slots'
  ) THEN
    ALTER TABLE courts ADD COLUMN confirmed_female_slots integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Drop old applications policies and recreate properly
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can create applications" ON applications;
DROP POLICY IF EXISTS "Owners can update applications" ON applications;

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id OR auth.uid() = owner_id);

CREATE POLICY "Users can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Owners can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = applicant_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = applicant_id);
