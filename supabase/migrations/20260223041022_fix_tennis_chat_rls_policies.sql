/*
  # Fix RLS for Tennis 1:1 Chat Creation

  ## Problem
  When a user applies to a tennis court post, the app creates a 1:1 chat room.
  The flow requires:
  1. Insert into `chats` (user1=host, user2=applicant) — OK, applicant is user2_id
  2. Insert TWO rows into `chat_participants` (one for host, one for self)
     — BLOCKED: current policy only allows `auth.uid() = user_id`, so inserting
       the host's participant row fails silently.
  3. Insert system message — BLOCKED because chat_participants is incomplete,
     and the message INSERT policy requires a participant row to exist.

  ## Solution
  - Allow the chat creator (either user1_id or user2_id) to insert participant
    rows for both users in the same chat they just created.
  - Allow system messages to be inserted when the sender is the chat creator
    (i.e., the authenticated user is user1 or user2 of that chat).
*/

-- Drop old restrictive participant insert policy
DROP POLICY IF EXISTS "Participants can join a chat" ON chat_participants;

-- New policy: allow authenticated users to insert participant rows for a chat
-- where they themselves are user1 or user2 (i.e., they created or are party to the chat)
CREATE POLICY "Chat members can add participants"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_participants.chat_id
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Drop old messages insert policy
DROP POLICY IF EXISTS "사용자는 본인 채팅방에 메시지 전송 가능" ON messages;

-- New policy: allow user messages from participants, and system messages from
-- either a participant OR from the chat's creator (user1/user2)
CREATE POLICY "Chat members can send messages"
  ON messages
  FOR INSERT
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
