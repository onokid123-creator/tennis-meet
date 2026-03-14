/*
  # Add court_id to chats table for duplicate-prevention

  ## Purpose
  Allows the application to identify whether a chat was created for a specific
  court posting, enabling:
  1. Accurate duplicate detection (same court + same two users = same chat)
  2. "Fresh start" on re-apply: when a user has left a chat (no longer in
     chat_participants), we can safely create a NEW chat even if an old one
     exists for the same court+participants combination

  ## Changes
  - `chats` table: add nullable `court_id uuid` column referencing `courts(id)`
    (nullable so existing 1:1 dating chats without a court remain valid)
  - Add index on court_id for fast lookups

  ## No data loss
  Existing rows simply have court_id = NULL, which is fine.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'court_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN court_id uuid REFERENCES courts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chats_court_id ON chats(court_id);
