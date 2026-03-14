/*
  # Fix chat_participants SELECT RLS - use security definer to avoid recursion

  ## Problem
  Migration 20260310051059 added a recursive self-join policy:
    EXISTS (SELECT 1 FROM chat_participants cp2 WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid())
  This causes infinite recursion because evaluating chat_participants requires
  checking the policy, which queries chat_participants again.

  ## Fix
  Replace the recursive policy with one that uses the `is_chat_participant` 
  security definer function, which bypasses RLS when checking membership.
  This allows users to see ALL rows for chats they are in, without recursion.
*/

-- Drop both existing SELECT policies
DROP POLICY IF EXISTS "chat_participants: users can view own rows" ON chat_participants;
DROP POLICY IF EXISTS "chat_participants: members can view all rows in shared chats" ON chat_participants;

-- Recreate the is_chat_participant helper (idempotent)
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

-- New SELECT policy: see all rows in chats you belong to, using the security definer helper
CREATE POLICY "chat_participants: members can view shared chat rows"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    is_chat_participant(chat_participants.chat_id, auth.uid())
  );
