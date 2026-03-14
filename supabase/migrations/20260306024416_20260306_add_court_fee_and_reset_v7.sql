/*
  # Add court_fee column and full data reset v7

  1. Schema Changes
    - Add `court_fee` (integer) column to courts table for tennis per-person court fee

  2. Data Reset
    - Delete all user-generated data for clean slate
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'court_fee'
  ) THEN
    ALTER TABLE courts ADD COLUMN court_fee integer DEFAULT NULL;
  END IF;
END $$;

DELETE FROM court_group_chat_messages;
DELETE FROM court_group_chat_participants;
DELETE FROM court_group_chats;
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM applications;
DELETE FROM courts;
DELETE FROM profiles;
DELETE FROM auth.users;
