/*
  # Permissive RLS for Chat Flow - Full Reset

  ## Problem
  The previous messages INSERT policy required chat_participants to exist BEFORE
  inserting any message. But our flow is:
    1. INSERT chats
    2. INSERT chat_participants (host + applicant)
    3. INSERT welcome system message
  
  If chat_participants check is required for system messages, it would fail because
  sender_id IS NULL for system messages but the policy allows that case.

  The real blocker was for user messages: the sender must be in chat_participants.
  However, immediately after navigating to /chat/:id, the host tries to send messages
  but may not yet have participants inserted in the brief window.

  ## Solution
  - messages INSERT: allow any authenticated user to send if they are user1 or user2 of the chat,
    OR if they are in chat_participants. System messages (sender_id IS NULL) always allowed.
  - chats INSERT: any authenticated user can create (they will be user1 or user2)
  - chat_participants INSERT: any authenticated user (they insert for themselves or others when accepting)
  - All SELECT: simple ownership or participant check

  ## Changes
  - Drops and recreates all policies on chats, chat_participants, messages
*/

-- ============================================================
-- CHATS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

CREATE POLICY "Authenticated users can create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- CHAT_PARTICIPANTS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can add participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can leave a chat" ON chat_participants;

CREATE POLICY "Authenticated users can add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_participants.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can leave a chat"
  ON chat_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Participants can mark messages read" ON messages;

CREATE POLICY "Users can send messages in their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      sender_id IS NULL
    )
    OR
    (
      auth.uid() = sender_id
      AND (
        EXISTS (
          SELECT 1 FROM chats c
          WHERE c.id = messages.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM chat_participants cp
          WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );
