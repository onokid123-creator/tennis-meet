/*
  # Add is_confirmed to chat_participants

  ## Changes
  - Adds `is_confirmed` boolean column (default false) to `chat_participants` table
  - This tracks whether a host has confirmed each participant for a group chat
  - Used to show confirmation badges in ChatRoom participant modal
  - Used for +1/-1 participant count logic on courts table

  ## Notes
  - Existing rows default to false (unconfirmed)
  - No RLS changes needed; existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_participants' AND column_name = 'is_confirmed'
  ) THEN
    ALTER TABLE chat_participants ADD COLUMN is_confirmed boolean DEFAULT false;
  END IF;
END $$;
