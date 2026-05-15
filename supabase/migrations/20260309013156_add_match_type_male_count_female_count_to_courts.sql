/*
  # Add match_type, male_count, female_count columns to courts

  1. Changes
    - Add `match_type` (text) - stores dating court match type ('단식' or '혼복')
    - Add `male_count` (integer) - stores male recruitment count for dating courts
    - Add `female_count` (integer) - stores female recruitment count for dating courts
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'match_type') THEN
    ALTER TABLE courts ADD COLUMN match_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'male_count') THEN
    ALTER TABLE courts ADD COLUMN male_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'female_count') THEN
    ALTER TABLE courts ADD COLUMN female_count integer DEFAULT 0;
  END IF;
END $$;
