/*
  # Fix accept_group_chat RPC - correct table names

  The existing accept_group_chat function was referencing non-existent tables
  (group_chats, group_chat_members). This migration replaces it with the correct
  implementation that uses the actual tables: chats and chat_participants.

  Changes:
  - Drop and recreate accept_group_chat to use chats (is_group=true) and chat_participants
  - Drop and recreate accept_1v1_chat to ensure SECURITY DEFINER is set
  - Both RPCs bypass RLS to safely insert participants
*/

CREATE OR REPLACE FUNCTION public.accept_group_chat(
  p_court_id UUID,
  p_host_id UUID,
  p_applicant_id UUID,
  p_purpose TEXT DEFAULT 'tennis'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE court_id = p_court_id
    AND user1_id = p_host_id
    AND is_group = true
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id, purpose, court_id, is_group)
    VALUES (p_host_id, NULL, p_purpose, p_court_id, true)
    RETURNING id INTO v_chat_id;

    INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
    VALUES (v_chat_id, p_host_id, true, now())
    ON CONFLICT (chat_id, user_id) DO UPDATE SET is_confirmed = true;

    v_is_new := true;
  END IF;

  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (v_chat_id, p_applicant_id, true, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET is_confirmed = true;

  RETURN json_build_object('chat_id', v_chat_id, 'is_new', v_is_new);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'is_new', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_1v1_chat(
  p_chat_id UUID,
  p_host_id UUID,
  p_applicant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_host_id, true, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET is_confirmed = true;

  INSERT INTO public.chat_participants (chat_id, user_id, is_confirmed, joined_at)
  VALUES (p_chat_id, p_applicant_id, true, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE SET is_confirmed = true;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
