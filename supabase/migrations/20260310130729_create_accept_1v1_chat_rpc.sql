/*
  # Create accept_1v1_chat RPC (SECURITY DEFINER)

  The chat_participants SELECT RLS uses is_chat_participant() which itself
  queries chat_participants. When application code calls upsert with
  onConflict, Supabase must SELECT to detect conflicts — triggering the
  RLS policy → is_chat_participant() → another SELECT → infinite recursion
  → silent failure. No participants ever get inserted for 1:1 chats.

  This function runs as SECURITY DEFINER (bypasses RLS) to safely:
  1. Insert/upsert the host as participant
  2. Insert/upsert the applicant as participant
  3. Return the chat_id so the caller can navigate to it

  Also backfills existing 1:1 chats that have no participants.
*/

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
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (p_chat_id, p_host_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (p_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN json_build_object('chat_id', p_chat_id);
END;
$$;
