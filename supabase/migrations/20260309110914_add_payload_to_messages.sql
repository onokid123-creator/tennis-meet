/*
  # Add payload column to messages table

  1. Changes
    - `messages` table: add `payload` (jsonb, nullable) column for after_proposal and leave_request message types
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'payload'
  ) THEN
    ALTER TABLE messages ADD COLUMN payload jsonb DEFAULT NULL;
  END IF;
END $$;
