/*
  # Add is_group column to chats table

  ## Changes
  - Adds `is_group` boolean column (default false) to `chats` table
    - When true, the chat is a group chat (복식/혼복) using chat_participants for all members
    - When false, the chat is a 1v1 chat (단식)

  ## Purpose
  - Unify group and 1v1 chats under a single `chats` table
  - Group chats reference the same `chat_participants` and `messages` tables
  - Enables real-time participant count via chat_participants row count
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE chats ADD COLUMN is_group boolean NOT NULL DEFAULT false;
  END IF;
END $$;
