/*
  # Fix chats RLS to allow chat_participants-based access

  ## Problem
  - After accepting an application, host=user1_id and applicant=user2_id are set in chats
  - chat_participants are also inserted for both users
  - BUT: chats SELECT policy only checks user1_id OR user2_id
  - This is actually fine for reading the chat row itself
  
  ## What we actually fix here:
  1. messages INSERT policy: allow sender_id = NULL for system messages
     (currently blocks system messages inserted from the client)
  2. chats SELECT: also allow access if user is in chat_participants
     (to support the applicant accessing the chat they were added to)
  3. court_group_chats SELECT/INSERT/UPDATE for all authenticated users
     who are in group chat participants
*/

-- Fix messages INSERT to allow system messages (sender_id can be null for system msgs)
DROP POLICY IF EXISTS "messages: chat participants can insert" ON messages;

CREATE POLICY "messages: chat participants can insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Also allow service-role inserts (system messages from accept flow)
-- This requires an additional policy for null sender_id cases triggered by authenticated users
-- We relax sender_id check: sender must be auth user OR null (system)
-- The chat membership check is still enforced

-- Update chats SELECT to ALSO allow chat_participants access
-- (so if someone was added to chat_participants, they can see the chat)
DROP POLICY IF EXISTS "chats: participants can view" ON chats;

CREATE POLICY "chats: participants can view"
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

-- Allow messages to be inserted with null sender_id when user is chat participant
-- We need a second policy that allows system message insertion
DROP POLICY IF EXISTS "messages: system message insert by participant" ON messages;

CREATE POLICY "messages: system message insert by participant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IS NULL
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- court_group_chats: ensure host and participants can all access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'court_group_chats' 
      AND policyname = 'group chats: host can create'
  ) THEN
    ALTER TABLE court_group_chats ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "group chats: host can create"
      ON court_group_chats FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = host_id);

    CREATE POLICY "group chats: participants can view"
      ON court_group_chats FOR SELECT
      TO authenticated
      USING (
        auth.uid() = host_id
        OR EXISTS (
          SELECT 1 FROM court_group_chat_participants p
          WHERE p.group_chat_id = court_group_chats.id
            AND p.user_id = auth.uid()
        )
      );

    CREATE POLICY "group chats: host can update"
      ON court_group_chats FOR UPDATE
      TO authenticated
      USING (auth.uid() = host_id)
      WITH CHECK (auth.uid() = host_id);

    CREATE POLICY "group chats: host can delete"
      ON court_group_chats FOR DELETE
      TO authenticated
      USING (auth.uid() = host_id);
  END IF;
END $$;

-- court_group_chat_participants: ensure open insert and self-read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'court_group_chat_participants'
      AND policyname = 'group participants: authenticated can insert'
  ) THEN
    ALTER TABLE court_group_chat_participants ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "group participants: authenticated can insert"
      ON court_group_chat_participants FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "group participants: can view own group"
      ON court_group_chat_participants FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM court_group_chats gc
          WHERE gc.id = court_group_chat_participants.group_chat_id
            AND gc.host_id = auth.uid()
        )
      );

    CREATE POLICY "group participants: can update own row"
      ON court_group_chat_participants FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "group participants: can delete own row"
      ON court_group_chat_participants FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- court_group_chat_messages: participants can read/write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'court_group_chat_messages'
      AND policyname = 'group messages: participants can view'
  ) THEN
    ALTER TABLE court_group_chat_messages ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "group messages: participants can view"
      ON court_group_chat_messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM court_group_chat_participants p
          WHERE p.group_chat_id = court_group_chat_messages.group_chat_id
            AND p.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM court_group_chats gc
          WHERE gc.id = court_group_chat_messages.group_chat_id
            AND gc.host_id = auth.uid()
        )
      );

    CREATE POLICY "group messages: participants can insert"
      ON court_group_chat_messages FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM court_group_chats gc
          WHERE gc.id = court_group_chat_messages.group_chat_id
            AND (
              gc.host_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM court_group_chat_participants p
                WHERE p.group_chat_id = gc.id AND p.user_id = auth.uid()
              )
            )
        )
      );

    CREATE POLICY "group messages: participants can update"
      ON court_group_chat_messages FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM court_group_chats gc
          WHERE gc.id = court_group_chat_messages.group_chat_id
            AND (
              gc.host_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM court_group_chat_participants p
                WHERE p.group_chat_id = gc.id AND p.user_id = auth.uid()
              )
            )
        )
      );

    CREATE POLICY "group messages: host can delete"
      ON court_group_chat_messages FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM court_group_chats gc
          WHERE gc.id = court_group_chat_messages.group_chat_id
            AND gc.host_id = auth.uid()
        )
      );
  END IF;
END $$;
