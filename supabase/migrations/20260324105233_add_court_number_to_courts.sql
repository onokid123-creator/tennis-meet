/*
  # Add court_number column to courts table

  ## Summary
  Adds a court_number column to the courts table so hosts can specify
  which court number they are playing on (e.g., "3번 코트").
  This helps participants know exactly which court to go to.

  ## Changes
  - courts: add court_number (text, nullable) column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'court_number'
  ) THEN
    ALTER TABLE public.courts ADD COLUMN court_number text;
  END IF;
END $$;
