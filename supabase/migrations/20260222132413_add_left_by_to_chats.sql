/*
  # Add left_by column to chats table

  ## Summary
  Adds a `left_by` array column to the `chats` table so that when a user
  leaves a chat, their user_id is stored here. The chat list query then
  filters out any chats where the current user's id is present in `left_by`.

  ## Changes
  - `chats.left_by` (text[], default '{}') — array of user IDs who have left
    this chat room. The chat is hidden from those users' list.

  ## Notes
  - No data is destroyed. The chat and messages remain in the DB.
  - If the other participant re-sends a message (future feature), the leaving
    user can be removed from left_by to show the chat again.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'left_by'
  ) THEN
    ALTER TABLE chats ADD COLUMN left_by text[] DEFAULT '{}';
  END IF;
END $$;
