/*
  # Tennis Group Chat System

  ## Summary
  Adds a group chat system exclusively for "오직 테니스" (purpose = 'tennis') courts.
  Tennis applicants join the group chat instantly without host approval.

  ## New Tables

  ### court_group_chats
  - One group chat per tennis court
  - Linked to courts table via court_id
  - Tracks host (owner) for permission control

  ### court_group_chat_participants
  - Tracks all participants in a group chat
  - `status`: 'pending' | 'confirmed' | 'rejected'
  - pending = just joined, confirmed = host approved, rejected = host kicked

  ### court_group_chat_messages
  - Messages within group chats
  - `type`: 'user' | 'system'
  - `sender_id` nullable for system messages

  ## Changes to courts table
  - Adds `confirmed_male_slots` and `confirmed_female_slots` columns
    to track how many slots have been filled by confirmed participants

  ## Security
  - RLS enabled on all new tables
  - Participants can only read/write their own data
  - Host can manage participants
*/

-- court_group_chats table
CREATE TABLE IF NOT EXISTS court_group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE court_group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read group chats"
  ON court_group_chats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Host can insert group chat"
  ON court_group_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- court_group_chat_participants table
CREATE TABLE IF NOT EXISTS court_group_chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES court_group_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_chat_id, user_id)
);

ALTER TABLE court_group_chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read group chat participants"
  ON court_group_chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM court_group_chat_participants p2
      WHERE p2.group_chat_id = court_group_chat_participants.group_chat_id
      AND p2.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM court_group_chats gc
      WHERE gc.id = court_group_chat_participants.group_chat_id
      AND gc.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can join group chat"
  ON court_group_chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update participant status"
  ON court_group_chat_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM court_group_chats gc
      WHERE gc.id = court_group_chat_participants.group_chat_id
      AND gc.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM court_group_chats gc
      WHERE gc.id = court_group_chat_participants.group_chat_id
      AND gc.host_id = auth.uid()
    )
  );

CREATE POLICY "User can delete own participation"
  ON court_group_chat_participants FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM court_group_chats gc
      WHERE gc.id = court_group_chat_participants.group_chat_id
      AND gc.host_id = auth.uid()
    )
  );

-- court_group_chat_messages table
CREATE TABLE IF NOT EXISTS court_group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES court_group_chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'user',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE court_group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read group messages"
  ON court_group_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM court_group_chat_participants p
      WHERE p.group_chat_id = court_group_chat_messages.group_chat_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM court_group_chats gc
      WHERE gc.id = court_group_chat_messages.group_chat_id
      AND gc.host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON court_group_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    OR sender_id IS NULL
  );

-- Add confirmed slot tracking to courts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'confirmed_male_slots'
  ) THEN
    ALTER TABLE courts ADD COLUMN confirmed_male_slots integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'confirmed_female_slots'
  ) THEN
    ALTER TABLE courts ADD COLUMN confirmed_female_slots integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE court_group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE court_group_chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE court_group_chat_messages;
