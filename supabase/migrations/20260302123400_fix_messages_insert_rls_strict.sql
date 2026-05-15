/*
  # Fix messages INSERT RLS to ensure it works cleanly

  ## Problem
  The current INSERT policy has a condition `(sender_id IS NULL) OR (...)` which
  was a legacy leftover for system messages. Now that system messages are also
  inserted server-side (via RPC), we keep the NULL path but tighten the check so
  that for non-NULL sender_id the user must:
    1. Be the authenticated user (auth.uid() = sender_id)
    2. Be a participant in the chat (chat_participants lookup — now non-recursive after previous migration)

  ## Changes
  - Drop and recreate messages INSERT policy with explicit conditions
  - No data loss — only policy change
*/

DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;

CREATE POLICY "Users can send messages in their chats"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IS NULL
    OR (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.chat_id = messages.chat_id
          AND cp.user_id = auth.uid()
      )
    )
  );
