
/*
  # Update RLS policies to use chat_participants

  ## Summary
  Replaces the left_by-based RLS policies on chats and messages with
  participant-existence-based checks using the new chat_participants table.
  A user can see a chat only if they have a row in chat_participants for it.

  ## Changes

  ### Modified Policies
  - chats SELECT: now checks EXISTS in chat_participants instead of left_by
  - messages SELECT: now checks EXISTS in chat_participants instead of left_by
  - messages INSERT: now checks EXISTS in chat_participants instead of left_by
  - messages UPDATE: now checks EXISTS in chat_participants instead of left_by

  ### Notes
  - The old left_by column remains in chats for historical data safety
  - No data is deleted or modified
*/

DROP POLICY IF EXISTS "사용자는 본인 채팅방 조회 가능" ON chats;
CREATE POLICY "사용자는 본인 채팅방 조회 가능"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
        AND chat_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "사용자는 본인 채팅방 메시지 조회 가능" ON messages;
CREATE POLICY "사용자는 본인 채팅방 메시지 조회 가능"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "사용자는 본인 채팅방에 메시지 전송 가능" ON messages;
CREATE POLICY "사용자는 본인 채팅방에 메시지 전송 가능"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
    AND (
      (type = 'user' AND auth.uid() = sender_id)
      OR (type = 'system' AND sender_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "사용자는 본인 채팅방 메시지 수정 가능" ON messages;
CREATE POLICY "사용자는 본인 채팅방 메시지 수정 가능"
  ON messages
  FOR UPDATE
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
