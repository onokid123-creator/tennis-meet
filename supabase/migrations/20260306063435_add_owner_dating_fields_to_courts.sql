/*
  # Add owner dating profile fields to courts table

  Adds optional columns to store the dating profile data of the court owner
  directly on the court record, so DatingCourtCard can display full profile
  info without an extra join.

  ## New Columns (all nullable)
  - owner_photos (text[]) — array of photo URLs
  - owner_mbti (text)
  - owner_height (int)
  - owner_bio (text)
  - owner_experience (text)
  - owner_gender (text)
  - owner_age (int)
  - owner_name (text)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_photos') THEN
    ALTER TABLE courts ADD COLUMN owner_photos text[] DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_mbti') THEN
    ALTER TABLE courts ADD COLUMN owner_mbti text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_height') THEN
    ALTER TABLE courts ADD COLUMN owner_height int DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_bio') THEN
    ALTER TABLE courts ADD COLUMN owner_bio text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_experience') THEN
    ALTER TABLE courts ADD COLUMN owner_experience text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_gender') THEN
    ALTER TABLE courts ADD COLUMN owner_gender text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_age') THEN
    ALTER TABLE courts ADD COLUMN owner_age int DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='owner_name') THEN
    ALTER TABLE courts ADD COLUMN owner_name text DEFAULT NULL;
  END IF;
END $$;
