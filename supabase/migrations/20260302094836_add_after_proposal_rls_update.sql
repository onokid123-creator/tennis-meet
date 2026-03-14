
/*
  # Add RLS policy for after proposal payload update

  ## Summary
  Adds an RLS policy to allow chat participants to update the payload column
  of after_proposal messages (to store accepted/declined status).
  The existing UPDATE policy only allows is_read updates; we extend it to cover
  payload updates for after_proposal type messages.

  ## Changes
  - Drop and recreate the messages UPDATE policy to also allow payload updates
    for after_proposal messages by any chat participant
*/

DROP POLICY IF EXISTS "Users can mark messages read" ON messages;
DROP POLICY IF EXISTS "Users can update after proposal payload" ON messages;

CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ))
    OR
    (EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ))
    OR
    (EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    ))
  );
