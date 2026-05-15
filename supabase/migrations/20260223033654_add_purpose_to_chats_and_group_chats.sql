/*
  # Add purpose column to chats and court_group_chats

  ## Summary
  Adds a `purpose` column (tennis / dating) to both `chats` and `court_group_chats`
  so the chat list can be split into two tabs: 테니스 모임 and 설레는 만남.

  ## Changes

  ### chats table
  - New column `purpose` (text, default 'dating') — 1:1 chats created from dating flow

  ### court_group_chats table
  - New column `purpose` (text, default 'tennis') — group chats are always tennis

  ## Notes
  - Existing rows are back-filled with their respective defaults via DEFAULT.
  - court_group_chats derives its purpose from courts.purpose, so we also add a
    trigger to auto-populate from the linked court on insert.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE chats ADD COLUMN purpose text NOT NULL DEFAULT 'dating';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'court_group_chats' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE court_group_chats ADD COLUMN purpose text NOT NULL DEFAULT 'tennis';
  END IF;
END $$;

UPDATE court_group_chats gc
SET purpose = COALESCE(
  (SELECT c.purpose FROM courts c WHERE c.id = gc.court_id LIMIT 1),
  'tennis'
)
WHERE purpose = 'tennis';
