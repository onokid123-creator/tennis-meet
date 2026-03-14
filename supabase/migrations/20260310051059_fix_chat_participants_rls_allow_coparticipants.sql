/*
  # Fix chat_participants RLS - allow seeing co-participants

  ## Problem
  The current SELECT policy is `auth.uid() = user_id`, meaning users can only
  see their OWN row. When fetching all participants of a group chat to build
  dynamic titles and participant lists, the query returns only the current user,
  so names of other participants are invisible.

  ## Fix
  Replace the restrictive single-row SELECT policy with one that allows any
  authenticated user to see ALL rows for a chat they are themselves a member of.
  This enables: group chat titles, participant lists, avatar grids, etc.

  All other policies (INSERT, UPDATE, DELETE) remain unchanged.
*/

-- Drop the old overly-restrictive SELECT policy
DROP POLICY IF EXISTS "chat_participants: users can view own rows" ON chat_participants;

-- New policy: you can see all participants of any chat you are in
CREATE POLICY "chat_participants: members can view all rows in shared chats"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.chat_id = chat_participants.chat_id
        AND cp2.user_id = auth.uid()
    )
  );
