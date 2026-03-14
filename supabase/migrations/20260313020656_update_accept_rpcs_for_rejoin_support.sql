/*
  # Update accept RPCs to support rejoining users

  ## Summary
  Updates the accept_group_chat and accept_1v1_chat RPC functions to properly
  handle users who previously left a chat and are reapplying.

  ## Changes

  ### accept_group_chat
  - Instead of ON CONFLICT DO NOTHING for the applicant, DELETE any existing
    participant row first, then INSERT fresh with current joined_at timestamp
  - This allows a user who previously left to rejoin with a fresh joined_at
  - Host participant still uses ON CONFLICT DO NOTHING (host never leaves)

  ### accept_1v1_chat
  - Same approach: DELETE existing applicant participant row, then INSERT fresh
  - Host participant still uses ON CONFLICT DO NOTHING

  ## Why
  ON CONFLICT DO NOTHING was silently ignoring rejoining users, keeping their
  old joined_at, which made it appear like "already accepted" because the
  row already existed. Now we always get a fresh joined_at for the applicant.
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
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
  v_is_new boolean := false;
BEGIN
  SELECT id INTO v_chat_id
  FROM chats
  WHERE court_id = p_court_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, p_host_id, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    v_is_new := true;

    INSERT INTO chat_participants (chat_id, user_id, joined_at)
    VALUES (v_chat_id, p_host_id, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  DELETE FROM chat_participants
  WHERE chat_id = v_chat_id AND user_id = p_applicant_id;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (v_chat_id, p_applicant_id, now());

  RETURN json_build_object(
    'chat_id', v_chat_id,
    'is_new', v_is_new
  );
END;
$$;

CREATE OR REPLACE FUNCTION accept_1v1_chat(
  p_chat_id   uuid,
  p_host_id   uuid,
  p_applicant_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (p_chat_id, p_host_id, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  DELETE FROM chat_participants
  WHERE chat_id = p_chat_id AND user_id = p_applicant_id;

  INSERT INTO chat_participants (chat_id, user_id, joined_at)
  VALUES (p_chat_id, p_applicant_id, now());

  RETURN json_build_object('chat_id', p_chat_id);
END;
$$;
