/*
  # Enable Realtime for courts, applications, and messages tables

  ## Purpose
  Supabase Realtime requires tables to be added to the `supabase_realtime` publication.
  Without this, postgres_changes subscriptions receive no events.

  ## Changes
  - Adds `courts` table to realtime publication
  - Adds `applications` table to realtime publication
  - Adds `messages` table to realtime publication

  ## Notes
  - Uses ALTER PUBLICATION to safely add tables without affecting existing ones
  - IF NOT EXISTS equivalent is handled by catching duplicate errors with DO block
*/

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE courts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
