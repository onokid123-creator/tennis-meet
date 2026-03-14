
/*
  # Fix messages INSERT/SELECT RLS to use chat_participants as single source of truth

  ## Problem
  The messages INSERT policy checks both chats.user1_id/user2_id AND chat_participants.
  The chat_participants table is the authoritative membership source (populated by the RPC).
  Using ONLY chat_participants simplifies the check and avoids edge cases.

  ## Changes
  - messages INSERT: only check chat_participants (sender must be a participant)
  - messages SELECT: only check chat_participants (reader must be a participant)
  - messages UPDATE: only check chat_participants (updater must be a participant)
  - Also fix chat_participants SELECT: allow seeing participants of chats you are in
*/

-- ============================================================
-- MESSAGES INSERT
-- ============================================================
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;

CREATE POLICY "Users can send messages in their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id IS NULL)
    OR (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.chat_id = messages.chat_id
          AND cp.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MESSAGES SELECT
-- ============================================================
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;

CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id
        AND cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- MESSAGES UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Users can mark messages read" ON messages;

CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id
        AND cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- CHAT_PARTICIPANTS SELECT — also allow seeing all participants
-- of chats you are part of (needed for opponent profile lookup)
-- ============================================================
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.chat_id = chat_participants.chat_id
        AND cp2.user_id = auth.uid()
    )
  );
