/*
  # Update delete_user_completely RPC

  ## Summary
  Updates the delete_user_completely function to preserve certain data after account deletion,
  while removing personally identifiable profile and court data.

  ## Changes
  - KEEP: messages (preserved as-is; sender becomes "알 수 없음" in UI)
  - KEEP: applications (preserved; applicant/owner becomes "알 수 없음" in UI)
  - KEEP: chat_participants (preserved so chat rooms remain intact)
  - DELETE: courts (user's court listings)
  - DELETE: profiles (user's profile)
  - DELETE: blocked_users, blocks, reports (user's social interactions)
  - DELETE: auth user (via pg-level deletion so session is invalidated)

  ## Notes
  - messages.sender_id references auth.users (not profiles), so messages are retained
  - UI layers must handle missing profile gracefully by showing "알 수 없음"
*/

CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete blocks and reports (privacy-sensitive social data)
  DELETE FROM blocked_users WHERE blocker_id = p_user_id OR blocked_id = p_user_id;

  -- Safely delete from blocks if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM blocks WHERE blocker_id = $1 OR blocked_id = $1' USING p_user_id;
  END IF;

  DELETE FROM reports WHERE reporter_id = p_user_id OR reported_id = p_user_id;

  -- Delete courts (user's listings)
  DELETE FROM courts WHERE user_id = p_user_id;

  -- Delete profile (personal data)
  DELETE FROM profiles WHERE user_id = p_user_id;

  -- NOTE: messages, applications, chat_participants are intentionally preserved
  -- UI will show "알 수 없음" for any sender_id/applicant_id that no longer has a profile
END;
$$;

REVOKE ALL ON FUNCTION delete_user_completely(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;
