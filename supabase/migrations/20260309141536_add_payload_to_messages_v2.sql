/*
  # Add payload column to messages table (if not exists)

  1. Changes
    - messages: Add `payload` jsonb nullable column
      Used for after_proposal status, leave_request metadata, etc.

  2. Notes
    - Safe with IF NOT EXISTS guard
    - No data loss
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'payload'
  ) THEN
    ALTER TABLE messages ADD COLUMN payload jsonb DEFAULT NULL;
  END IF;
END $$;
