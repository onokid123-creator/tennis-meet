/*
  # Create accept_group_chat RPC function

  ## Purpose
  Provides a SECURITY DEFINER function to handle group chat acceptance.
  This bypasses RLS so the host can:
  1. Find or create the group chat for the court
  2. Add the applicant as a participant
  3. Return the chat ID and whether it was newly created

  ## Why needed
  RLS on chats/chat_participants can block legitimate operations when:
  - Searching for an existing group chat the host didn't create directly
  - Inserting participants for other users

  ## Function: accept_group_chat(court_id, host_id, applicant_id, purpose)
  Returns: JSON { chat_id, is_new }
*/

CREATE OR REPLACE FUNCTION accept_group_chat(
  p_court_id uuid,
  p_host_id uuid,
  p_applicant_id uuid,
  p_purpose text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id uuid;
  v_is_new boolean := false;
BEGIN
  -- Find existing group chat for this court
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = true
  LIMIT 1;

  -- Create new group chat if none exists
  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    v_is_new := true;

    -- Add host as participant
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, p_host_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  -- Add applicant as participant (safe upsert)
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new
  );
END;
$$;
