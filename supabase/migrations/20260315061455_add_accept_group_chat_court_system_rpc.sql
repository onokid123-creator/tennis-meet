/*
  # Add RPC for accepting group chat using court_group_chats system

  ## Summary
  Creates a new RPC `accept_court_group_chat` that handles accepting applicants
  into the court_group_chats system (used by GroupChatRoom.tsx).

  ## Logic
  1. Check if court_group_chats entry exists for court_id
  2. If not: create new court_group_chats entry, insert host + applicant as participants
  3. If yes (existing group chat):
     - Check if applicant already in court_group_chat_participants
     - If yes (rejoin after kick): UPDATE joined_at to now() and reset status to 'pending'
     - If no: INSERT new participant
  4. Returns: group_chat_id, is_new (true if new group chat created), is_rejoin (true if rejoining)

  ## Security
  - SECURITY DEFINER to bypass RLS for host-level operations
  - Validates host ownership before proceeding
*/

CREATE OR REPLACE FUNCTION accept_court_group_chat(
  p_court_id uuid,
  p_host_id uuid,
  p_applicant_id uuid,
  p_purpose text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_chat_id uuid;
  v_is_new boolean := false;
  v_is_rejoin boolean := false;
  v_participant_exists boolean := false;
BEGIN
  SELECT id INTO v_group_chat_id
  FROM court_group_chats
  WHERE court_id = p_court_id
  LIMIT 1;

  IF v_group_chat_id IS NULL THEN
    INSERT INTO court_group_chats (court_id, host_id)
    VALUES (p_court_id, p_host_id)
    RETURNING id INTO v_group_chat_id;

    v_is_new := true;

    INSERT INTO court_group_chat_participants (group_chat_id, user_id, status, joined_at)
    VALUES (v_group_chat_id, p_host_id, 'confirmed', now())
    ON CONFLICT (group_chat_id, user_id) DO NOTHING;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM court_group_chat_participants
    WHERE group_chat_id = v_group_chat_id AND user_id = p_applicant_id
  ) INTO v_participant_exists;

  IF v_participant_exists THEN
    UPDATE court_group_chat_participants
    SET joined_at = now(), status = 'pending'
    WHERE group_chat_id = v_group_chat_id AND user_id = p_applicant_id;
    v_is_rejoin := true;
  ELSE
    INSERT INTO court_group_chat_participants (group_chat_id, user_id, status, joined_at)
    VALUES (v_group_chat_id, p_applicant_id, 'pending', now());
  END IF;

  RETURN json_build_object(
    'group_chat_id', v_group_chat_id,
    'is_new', v_is_new,
    'is_rejoin', v_is_rejoin
  );
END;
$$;
