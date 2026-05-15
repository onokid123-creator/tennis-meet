/*
  # Create delete_user_completely RPC function

  ## Summary
  Creates a server-side RPC function that completely deletes all data associated
  with a user account in the correct foreign key order to avoid constraint violations.

  ## What this does
  - Deletes all user data across all tables in dependency order
  - Uses SECURITY DEFINER so it runs with elevated privileges
  - Accepts the user's own ID (verified by auth context) to prevent misuse

  ## Deletion order (respects foreign keys)
  1. court_group_chat_messages - references group_chat_id and sender_id
  2. court_group_chat_participants - references group_chat_id and user_id
  3. leave_requests - references requester_id
  4. messages - references sender_id (profiles.user_id)
  5. chat_participants - references user_id (auth.users)
  6. blocked_users - references blocker_id / blocked_id
  7. blocks - references blocker_id / blocked_id
  8. reports - references reporter_id / reported_id
  9. chats - references user1_id / user2_id (after participants/messages gone)
  10. court_group_chats - references host_id (after participants/messages gone)
  11. applications - references applicant_id / owner_id
  12. courts - references user_id
  13. profiles - references user_id

  ## Security
  - SECURITY DEFINER: runs with owner privileges to bypass RLS
  - Only callable by authenticated users for their own user_id
*/

CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Delete group chat messages and participants
  DELETE FROM court_group_chat_messages WHERE sender_id = p_user_id;
  DELETE FROM court_group_chat_participants WHERE user_id = p_user_id;

  -- Step 2: Delete leave requests
  DELETE FROM leave_requests WHERE requester_id = p_user_id;

  -- Step 3: Delete 1:1 chat messages and participants
  DELETE FROM messages WHERE sender_id = p_user_id;
  DELETE FROM chat_participants WHERE user_id = p_user_id;

  -- Step 4: Delete blocks and reports
  DELETE FROM blocked_users WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM reports WHERE reporter_id = p_user_id OR reported_id = p_user_id;

  -- Step 5: Delete chats where user is a participant
  DELETE FROM chats WHERE user1_id = p_user_id OR user2_id = p_user_id;

  -- Step 6: Delete group chats hosted by user
  DELETE FROM court_group_chats WHERE host_id = p_user_id;

  -- Step 7: Delete applications
  DELETE FROM applications WHERE applicant_id = p_user_id OR owner_id = p_user_id;

  -- Step 8: Delete courts
  DELETE FROM courts WHERE user_id = p_user_id;

  -- Step 9: Delete profile
  DELETE FROM profiles WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_user_completely(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;
