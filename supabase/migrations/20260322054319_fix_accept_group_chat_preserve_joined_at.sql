/*
  # Fix accept_group_chat RPC

  ## Summary
  The existing accept_group_chat RPC had two issues:
  1. When a new participant is added to an existing group chat, the host's joined_at was also
     reset to now() via ON CONFLICT DO UPDATE SET joined_at = now(). This broke message filtering
     for existing participants (they could no longer see their own older messages).
  2. System entry messages were being inserted into court_group_chat_messages (wrong table).
     The ChatRoom component uses the messages table.

  ## Changes
  - Rewrites accept_group_chat to only set joined_at for new participants (not update existing ones)
  - Preserves existing participants' joined_at so their message history is unaffected
  - Removes the system message insert (handled in Applications.tsx in the correct table)
*/

CREATE OR REPLACE FUNCTION accept_group_chat(
  p_court_id UUID,
  p_host_id UUID,
  p_applicant_id UUID,
  p_purpose TEXT DEFAULT 'tennis'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  -- Find existing group chat for this court
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE court_id = p_court_id
    AND user1_id = p_host_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    -- Create new group chat
    INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group, confirmed_user_ids)
    VALUES (p_host_id, NULL, p_purpose, p_court_id, true, '{}')
    RETURNING id INTO v_chat_id;

    -- Add host as first participant (only insert, never update existing)
    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_host_id, false, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    v_is_new := true;
  END IF;

  -- Add new participant only if not already in the chat
  -- Use DO NOTHING so existing participants keep their original joined_at
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (v_chat_id, p_applicant_id, false, now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', v_is_new);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;
