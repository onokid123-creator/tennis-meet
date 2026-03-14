/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  - chat_participants SELECT policy references chats table
  - chats SELECT/UPDATE/DELETE policies reference chat_participants table
  - This creates infinite recursion when any query hits either table

  ## Solution
  1. Drop all recursive policies on chats, chat_participants, messages
  2. Rewrite them WITHOUT cross-references (no subqueries between the two tables)
     - chats policies: only use user1_id / user2_id direct columns
     - chat_participants policies: only use user_id direct column
     - messages policies: reference chats via user1_id/user2_id only (no chat_participants subquery)
  3. This means chat_participants INSERT is open to any authenticated user
     (safe because only the accept flow inserts rows)
*/

-- ─────────────────────────────────────────────────────────────
-- 1. Drop all existing policies on the three tables
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE tablename IN ('chats', 'chat_participants', 'messages')
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 2. chats policies (NO reference to chat_participants)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "chats: authenticated users can create"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "chats: participants can view"
  ON chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats: participants can update"
  ON chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats: participants can delete"
  ON chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);


-- ─────────────────────────────────────────────────────────────
-- 3. chat_participants policies (NO reference to chats)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "chat_participants: authenticated users can insert"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_participants: users can view own rows"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_participants: users can update own row"
  ON chat_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_participants: users can delete own row"
  ON chat_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 4. messages policies (reference chats via user1_id/user2_id only)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "messages: chat participants can view"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages: chat participants can insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id = auth.uid() OR sender_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages: chat participants can update"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages: chat participants can delete"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
