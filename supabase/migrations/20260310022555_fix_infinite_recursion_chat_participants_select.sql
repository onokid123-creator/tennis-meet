/*
  # Fix infinite recursion in chat_participants SELECT policy

  ## Problem
  The "members can view same chat" policy on chat_participants does a self-referential
  EXISTS subquery back to chat_participants itself. PostgreSQL evaluates this recursively
  and hits a stack overflow / infinite recursion error.

  ## Fix
  Replace the recursive SELECT policy with a simple rule:
  users can only see their OWN rows. This is sufficient because:
  - The app only needs to know "am I a participant in this chat?" (own row)
  - Group avatar loading fetches profiles by user_id from profiles table, not chat_participants
  - The chats/messages RLS policies check chat_participants with a simple non-recursive query

  Additionally fix messages and chats RLS policies that also reference chat_participants
  via a subquery on chats — those chain: messages -> chats -> chat_participants.
  That chain itself is fine (no recursion), but let's simplify them to use a security
  definer function to avoid any potential plan issues.
*/

-- ── Step 1: Drop the recursive policy ──────────────────────────────────────
DROP POLICY IF EXISTS "chat_participants: members can view same chat" ON chat_participants;

-- ── Step 2: Replace with simple non-recursive policy ───────────────────────
CREATE POLICY "chat_participants: users can view own rows"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Step 3: Create a SECURITY DEFINER helper function to check participation
--    This breaks the recursion chain by running the check outside RLS context
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_chat_participant(p_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  );
$$;

-- ── Step 4: Rewrite messages policies to use the helper function ────────────
DROP POLICY IF EXISTS "messages: participant can insert" ON messages;
DROP POLICY IF EXISTS "messages: participant can view" ON messages;
DROP POLICY IF EXISTS "messages: participant can update" ON messages;
DROP POLICY IF EXISTS "messages: participant can delete" ON messages;

CREATE POLICY "messages: participant can insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR is_chat_participant(c.id, auth.uid())
        )
    )
  );

CREATE POLICY "messages: participant can view"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR is_chat_participant(c.id, auth.uid())
        )
    )
  );

CREATE POLICY "messages: participant can update"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR is_chat_participant(c.id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR is_chat_participant(c.id, auth.uid())
        )
    )
  );

CREATE POLICY "messages: participant can delete"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user1_id = auth.uid()
          OR c.user2_id = auth.uid()
          OR is_chat_participant(c.id, auth.uid())
        )
    )
  );

-- ── Step 5: Rewrite chats policies to use the helper function ───────────────
DROP POLICY IF EXISTS "chats: participants can delete" ON chats;
DROP POLICY IF EXISTS "chats: participants can update" ON chats;
DROP POLICY IF EXISTS "chats: participants can view" ON chats;

CREATE POLICY "chats: participants can view"
  ON chats FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR is_chat_participant(id, auth.uid())
  );

CREATE POLICY "chats: participants can update"
  ON chats FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR is_chat_participant(id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR is_chat_participant(id, auth.uid())
  );

CREATE POLICY "chats: participants can delete"
  ON chats FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR is_chat_participant(id, auth.uid())
  );
