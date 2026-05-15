/*
  # Full RLS Reset - Clean Permissive Policies for Authenticated Users

  ## Summary
  The previous policies had a chicken-and-egg problem:
  - chats SELECT required chat_participants to exist first
  - messages SELECT also required chat_participants
  - But chat_participants can only be added after chats is created
  - And after chats INSERT, user navigates to /chat/:id which tries to SELECT chats

  ## Solution
  Simplify to: any authenticated user can SELECT chats/messages where they are user1 or user2,
  OR where they are in chat_participants. This covers the window between chat creation and participant insertion.

  ## Changes
  - chats SELECT: allow if auth.uid() is user1_id OR user2_id (direct ownership check)
  - messages SELECT: allow if user is participant OR is user1/user2 of the chat
  - All INSERT policies remain permissive for authenticated users
*/

-- ============================================================
-- CHATS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Participants can view their chats" ON chats;

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
-- MESSAGES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Participants can view messages" ON messages;

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

-- ============================================================
-- CHAT_PARTICIPANTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can view own participation" ON chat_participants;

CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
    )
  );
