/*
  # Fix court_group_chats INSERT RLS

  ## Problem
  The existing INSERT policy on court_group_chats required auth.uid() = host_id,
  meaning only the court host could create the group chat room. However, when an
  applicant clicks "참가 신청하기" and no chat room exists yet, the applicant (not
  the host) attempts to create it — which was blocked by RLS.

  ## Fix
  Replace "Host can insert group chat" with a permissive policy that allows any
  authenticated user to create a group chat. The host_id value is still stored
  correctly in the row (passed from the court's user_id in frontend code), so
  downstream host-permission checks remain valid.
*/

DROP POLICY IF EXISTS "Host can insert group chat" ON court_group_chats;

CREATE POLICY "Authenticated users can create group chat"
  ON court_group_chats FOR INSERT
  TO authenticated
  WITH CHECK (true);
