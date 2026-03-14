/*
  # Fix chat_participants SELECT RLS - remove recursive self-reference

  ## Problem
  The current SELECT policy on chat_participants uses a subquery that references
  chat_participants itself (cp2), creating a recursive RLS evaluation that can
  fail silently, causing:
  - opponent profile lookup to return null (header shows '...' and '?')
  - messages INSERT to fail because the RLS check on messages uses chat_participants,
    which itself fails to evaluate due to the recursive policy

  ## Fix
  Replace the recursive policy with a non-recursive one that checks the chats table
  (user1_id / user2_id) OR simply allows authenticated users to see rows where
  they are the participant. This breaks the recursion entirely.

  ## Changes
  - Drop old recursive SELECT policy on chat_participants
  - Create new simple SELECT policy: user can see their own rows + rows in same chat
    via chats table reference (non-recursive)
*/

DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

CREATE POLICY "Users can view chat participants"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_participants.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
