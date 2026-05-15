/*
  # Fix RLS Policies for Chat System

  ## Summary
  Drops and recreates all RLS policies for chats, messages, chat_participants,
  and applications tables to ensure:
  1. Authenticated users can INSERT into chats and applications freely
  2. SELECT is restricted to rows the user is a participant in (via chat_participants)
  3. Fresh-start logic works: users who left a chat (removed from chat_participants)
     cannot see messages in that chat
  4. System messages (sender_id IS NULL) can be inserted by any authenticated user
     who is a participant OR who created the chat

  ## Tables Modified
  - chats: drop all old policies, add clean INSERT + SELECT
  - messages: drop all old policies, add clean INSERT + SELECT + UPDATE
  - chat_participants: drop all old policies, add clean INSERT + SELECT + DELETE
  - applications: drop all old policies, add clean INSERT + SELECT + UPDATE
*/

-- ============================================================
-- chats
-- ============================================================
DROP POLICY IF EXISTS "사용자는 채팅방 생성 가능" ON chats;
DROP POLICY IF EXISTS "사용자는 본인 채팅방 조회 가능" ON chats;

CREATE POLICY "Authenticated users can create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants can view their chats"
  ON chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
        AND chat_participants.user_id = auth.uid()
    )
  );

-- ============================================================
-- chat_participants
-- ============================================================
DROP POLICY IF EXISTS "Chat owner or member can add participants" ON chat_participants;
DROP POLICY IF EXISTS "Participants can view own membership" ON chat_participants;
DROP POLICY IF EXISTS "Participants can leave a chat" ON chat_participants;

CREATE POLICY "Authenticated users can add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own participation"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave a chat"
  ON chat_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- messages
-- ============================================================
DROP POLICY IF EXISTS "Chat members can send messages" ON messages;
DROP POLICY IF EXISTS "사용자는 본인 채팅방 메시지 조회 가능" ON messages;
DROP POLICY IF EXISTS "사용자는 본인 채팅방 메시지 수정 가능" ON messages;

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      type = 'user'
      AND auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.chat_id = messages.chat_id
          AND chat_participants.user_id = auth.uid()
      )
    )
    OR
    (
      type = 'system'
      AND sender_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM chat_participants
          WHERE chat_participants.chat_id = messages.chat_id
            AND chat_participants.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM chats
          WHERE chats.id = messages.chat_id
            AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  );

-- ============================================================
-- applications
-- ============================================================
DROP POLICY IF EXISTS "사용자는 신청 가능" ON applications;
DROP POLICY IF EXISTS "사용자는 본인 신청 조회 가능" ON applications;
DROP POLICY IF EXISTS "호스트는 신청 상태 수정 가능" ON applications;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'applications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON applications', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can apply"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can view relevant applications"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id OR auth.uid() = owner_id);

CREATE POLICY "Owners can update application status"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
