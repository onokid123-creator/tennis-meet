/*
  # Add last_read_at to court_group_chat_participants

  ## Summary
  Adds a `last_read_at` timestamp column to `court_group_chat_participants` to track
  when each participant last read messages in a group chat room. This enables real-time
  unread message count display per message in GroupChatRoom.

  ## Changes
  - `court_group_chat_participants`
    - Added: `last_read_at` (timestamptz, nullable, default NULL) — stores the timestamp
      of the last time a participant read messages in the group chat

  ## Notes
  - Column is nullable so existing rows remain valid
  - Default is NULL meaning "never read" — unread count will show maximum for those participants
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'court_group_chat_participants' AND column_name = 'last_read_at'
  ) THEN
    ALTER TABLE court_group_chat_participants ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;
