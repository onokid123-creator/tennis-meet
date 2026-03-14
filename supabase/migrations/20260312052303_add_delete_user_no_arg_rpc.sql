/*
  # Add no-argument delete_user_completely wrapper

  ## Summary
  Adds a no-argument overload of delete_user_completely() that identifies the calling user
  via auth.uid(). This is needed because the frontend calls supabase.rpc('delete_user_completely')
  without arguments — the function resolves the user from the current authenticated session.

  ## What it does
  1. Deletes courts owned by the user
  2. Deletes blocked_users, blocks, reports (privacy-sensitive)
  3. Deletes the user's profile row (triggers cascade to auth.users if trigger exists)
  4. Preserves messages, applications, chat_participants — UI shows "탈퇴한 사용자" for missing profiles

  ## Notes
  - Uses SECURITY DEFINER so it can delete from auth.users if needed
  - The existing delete_user_completely(uuid) overload is kept for admin/server use
*/

CREATE OR REPLACE FUNCTION delete_user_completely()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete privacy-sensitive social data
  DELETE FROM blocked_users WHERE blocker_id = v_user_id OR blocked_id = v_user_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM blocks WHERE blocker_id = $1 OR blocked_id = $1' USING v_user_id;
  END IF;

  DELETE FROM reports WHERE reporter_id = v_user_id OR reported_id = v_user_id;

  -- Delete courts (user's court listings)
  DELETE FROM courts WHERE user_id = v_user_id;

  -- Delete profile (personal data) — if a trigger exists it will cascade to auth.users
  DELETE FROM profiles WHERE user_id = v_user_id;

  -- NOTE: messages, applications, chat_participants are intentionally preserved
  -- UI will show "탈퇴한 사용자" / "알 수 없음" for sender_id with no matching profile
END;
$$;

REVOKE ALL ON FUNCTION delete_user_completely() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;
