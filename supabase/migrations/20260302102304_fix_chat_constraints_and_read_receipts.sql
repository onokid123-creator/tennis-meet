
/*
  # Fix chat unique constraints and add read receipt support

  ## Summary
  The chats table had a unique constraint on (user1_id, user2_id) which prevented
  the same two users from having both a tennis chat and a dating chat. This migration
  removes that constraint and adds a composite unique on (user1_id, user2_id, purpose)
  so each purpose can have its own chat between the same pair.

  Also adds last_read_at to chat_participants for read receipt ("1" unread indicator).

  ## Changes
  1. Drop old unique constraint chats_user1_id_user2_id_key
  2. Add new unique constraint on (user1_id, user2_id, purpose) 
  3. Add last_read_at column to chat_participants

  ## Notes
  - chat_participants already has unique on (chat_id, user_id) — kept as-is
  - ON CONFLICT handling in app code will now use the new constraint
*/

-- 1. Drop old overly-restrictive unique constraint
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user1_id_user2_id_key;

-- 2. Add purpose-aware unique constraint
-- (allows tennis + dating chats between same user pair)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chats_user1_id_user2_id_purpose_key'
  ) THEN
    ALTER TABLE chats ADD CONSTRAINT chats_user1_id_user2_id_purpose_key
      UNIQUE (user1_id, user2_id, purpose);
  END IF;
END $$;

-- 3. Add last_read_at to chat_participants for read receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_participants' AND column_name = 'last_read_at'
  ) THEN
    ALTER TABLE chat_participants
      ADD COLUMN last_read_at timestamptz DEFAULT now();
  END IF;
END $$;
