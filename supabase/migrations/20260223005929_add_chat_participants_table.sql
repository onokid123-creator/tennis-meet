
/*
  # Add chat_participants table for kakao-style chat exit

  ## Summary
  Introduces a `chat_participants` table so that each user's membership in a chat
  room is tracked as an individual row. When a user leaves a chat, only their row
  is deleted — the chat itself and the other participant's row remain intact.

  ## Changes

  ### New Tables
  - `chat_participants`
    - `id` (uuid, primary key)
    - `chat_id` (uuid, FK → chats.id CASCADE DELETE)
    - `user_id` (uuid, FK → auth.users.id CASCADE DELETE)
    - `joined_at` (timestamptz, default now())
    - UNIQUE constraint on (chat_id, user_id)

  ### Data Migration
  - Backfills one row per participant for every existing chat using user1_id/user2_id

  ### Security
  - RLS enabled on chat_participants
  - SELECT: authenticated user can only see rows where user_id = auth.uid()
  - INSERT: authenticated user can only insert rows where user_id = auth.uid()
  - DELETE: authenticated user can only delete their own row

  ### Notes
  - The existing chats table and left_by column are left untouched for safety
  - All new chat creation should also insert into chat_participants
*/

CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own membership"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Participants can join a chat"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can leave a chat"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user1_id FROM chats
ON CONFLICT (chat_id, user_id) DO NOTHING;

INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user2_id FROM chats
ON CONFLICT (chat_id, user_id) DO NOTHING;
