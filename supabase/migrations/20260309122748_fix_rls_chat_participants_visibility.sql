/*
  # Fix RLS Policies: Chat & Message Visibility via chat_participants

  ## Problem
  - `chats` SELECT policy only checks `user1_id` / `user2_id` columns
  - `messages` SELECT/UPDATE policy has the same limitation
  - Users who are in `chat_participants` but not in `user1_id`/`user2_id` cannot see chats or messages

  ## Changes
  1. `chats` table SELECT policy — also allow if user is in `chat_participants`
  2. `messages` table SELECT policy — also allow if user is in `chat_participants`
  3. `messages` table UPDATE policy — same fix
  4. `messages` table INSERT policy — add explicit WITH CHECK using chat_participants
*/

-- Fix chats SELECT policy
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
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

-- Fix messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- Fix messages UPDATE policy
DROP POLICY IF EXISTS "Users can mark messages read" ON messages;
CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- Fix messages INSERT policy — ensure sender is participant
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;
CREATE POLICY "Users can send messages in their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );

-- Fix chats DELETE policy if missing
DROP POLICY IF EXISTS "Chat participants can delete chat" ON chats;
CREATE POLICY "Chat participants can delete chat"
  ON chats FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- Fix messages DELETE policy
DROP POLICY IF EXISTS "Chat participants can delete messages" ON messages;
CREATE POLICY "Chat participants can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
          )
        )
    )
  );
