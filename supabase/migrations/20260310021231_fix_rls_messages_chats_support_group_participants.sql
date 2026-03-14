/*
  # Fix RLS for messages and chats to support group chat participants

  ## Problem
  - messages RLS INSERT/SELECT/UPDATE/DELETE policies only check user1_id / user2_id on the chats table
  - For group chats, participants beyond user1/user2 are stored in chat_participants table only
  - This means group chat members cannot send, read, or delete messages

  ## Changes
  1. Drop all existing messages policies and replace with participant-aware ones
     (checking either user1_id/user2_id OR presence in chat_participants)
  2. Drop and replace chats DELETE policy to allow chat_participants members to trigger cleanup
  3. Add a helper: chat_participants INSERT policy already allows any auth user to insert for themselves
     — verify it still works correctly after these changes
*/

-- ── Messages: drop all and recreate ────────────────────────────

DROP POLICY IF EXISTS "messages: chat participants can insert" ON messages;
DROP POLICY IF EXISTS "messages: system message insert by participant" ON messages;
DROP POLICY IF EXISTS "messages: chat participants can view" ON messages;
DROP POLICY IF EXISTS "messages: chat participants can update" ON messages;
DROP POLICY IF EXISTS "messages: chat participants can delete" ON messages;

CREATE POLICY "messages: participant can insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "messages: participant can view"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "messages: participant can update"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "messages: participant can delete"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- ── Chats: extend DELETE and UPDATE to also cover chat_participants ──

DROP POLICY IF EXISTS "chats: participants can delete" ON chats;
DROP POLICY IF EXISTS "chats: participants can update" ON chats;

CREATE POLICY "chats: participants can delete"
  ON chats FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "chats: participants can update"
  ON chats FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- ── chat_participants: also allow inserting OTHER users' rows ──
-- The host needs to insert a row for the applicant (different user_id)
-- Current policy: WITH CHECK (true) already allows it — keep as is
-- But verify the SELECT policy allows reading other participants in the same chat

DROP POLICY IF EXISTS "chat_participants: users can view own rows" ON chat_participants;

CREATE POLICY "chat_participants: members can view same chat"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.chat_id = chat_participants.chat_id
        AND cp2.user_id = auth.uid()
    )
  );
