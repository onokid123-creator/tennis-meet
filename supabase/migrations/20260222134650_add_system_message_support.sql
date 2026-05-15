/*
  # Add system message support to messages table

  1. Changes
    - `messages.sender_id`: Make nullable to allow system messages (no sender)
    - `messages.type`: Add new column (default 'user', can be 'system') to distinguish system messages from user messages

  2. Security
    - Update INSERT policy to allow system messages (sender_id IS NULL when type = 'system')
    - SELECT policy unchanged (participants can still read all messages in their chats)

  3. Notes
    - Existing messages are unaffected (sender_id remains set, type defaults to 'user')
    - System messages are inserted server-side when a user leaves a chat room
*/

-- Make sender_id nullable for system messages
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- Add type column to distinguish system vs user messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'type'
  ) THEN
    ALTER TABLE messages ADD COLUMN type text NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Drop old INSERT policy and replace with one that allows system messages
DROP POLICY IF EXISTS "사용자는 본인 채팅방에 메시지 전송 가능" ON messages;

CREATE POLICY "사용자는 본인 채팅방에 메시지 전송 가능"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
    AND (
      (type = 'user' AND auth.uid() = sender_id)
      OR (type = 'system' AND sender_id IS NULL)
    )
  );
