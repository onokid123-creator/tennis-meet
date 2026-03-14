/*
  # Fix chat_participants DELETE policy to allow deleting all participants when leaving

  ## Problem
  The current DELETE policy only allows a user to delete their own row (auth.uid() = user_id).
  When a user leaves a chat, we want to delete ALL participants (both users) so both sides
  see the chat removed.

  ## Changes
  - Drop old restrictive DELETE policy
  - Create new DELETE policy: authenticated user can delete any participant row
    IF they are also a participant in that same chat
*/

DROP POLICY IF EXISTS "Users can leave a chat" ON chat_participants;

CREATE POLICY "Chat members can remove all participants"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_participants.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
