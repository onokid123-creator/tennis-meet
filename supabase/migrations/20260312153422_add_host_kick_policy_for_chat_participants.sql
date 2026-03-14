/*
  # Add host kick policy for chat_participants

  ## Changes
  - Adds a new DELETE policy on chat_participants allowing the chat host (user1_id in chats table) to delete other participants' rows
  - This enables the kick/강퇴 feature where a host can remove participants from a group chat
*/

CREATE POLICY "chat_participants: host can delete other users"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_participants.chat_id
        AND chats.user1_id = auth.uid()
        AND chats.is_group = true
    )
  );
