
/*
  # Add missing UPDATE RLS policies

  ## Problem
  - chat_participants had no UPDATE policy → last_read_at updates failed
  - chats had no UPDATE policy → any chat metadata update failed

  ## Changes
  1. Add UPDATE policy to chat_participants for own row
  2. Add UPDATE policy to chats for participants to update left_by etc.
*/

-- chat_participants UPDATE: users can update their own participant row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_participants'
      AND policyname = 'Users can update own participant row'
  ) THEN
    CREATE POLICY "Users can update own participant row"
      ON chat_participants FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- chats UPDATE: users who are participants can update the chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chats'
      AND policyname = 'Chat participants can update chat'
  ) THEN
    CREATE POLICY "Chat participants can update chat"
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
  END IF;
END $$;
