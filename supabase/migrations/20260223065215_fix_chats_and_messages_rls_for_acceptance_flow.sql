/*
  # Fix RLS policies for chat creation during application acceptance flow

  ## Problem
  When a host accepts an application:
  1. Host creates a new chat row (user1_id = host, user2_id = applicant) — OK
  2. Host inserts into chat_participants for themselves — BLOCKED because the policy
     checks participant existence in chats, but participants don't exist yet
  3. System message INSERT fails because sender_id IS NULL system messages require
     an existing chat_participant row

  ## Solution
  - Replace the chat_participants INSERT policy so that either participant of the
    referenced chat (user1_id or user2_id) can add rows, not just existing participants
  - Widen system message INSERT to allow the chat creator (user1_id or user2_id) to
    post system messages even before chat_participants rows are fully created
  - No data is lost; RLS still enforces authentication and ownership
*/

-- Fix chat_participants INSERT policy
-- Old: requires auth.uid() to already be in chat_participants (circular dependency)
-- New: requires auth.uid() to be user1_id or user2_id on the referenced chat
DROP POLICY IF EXISTS "Chat members can add participants" ON chat_participants;

CREATE POLICY "Chat owner or member can add participants"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_participants.chat_id
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Fix messages INSERT for system messages: allow chat owner (user1_id) to send
-- system messages even if chat_participants rows are not yet fully populated
DROP POLICY IF EXISTS "Chat members can send messages" ON messages;

CREATE POLICY "Chat members can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      type = 'user'
      AND auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.chat_id = messages.chat_id
          AND chat_participants.user_id = auth.uid()
      )
    )
    OR
    (
      type = 'system'
      AND sender_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM chat_participants
          WHERE chat_participants.chat_id = messages.chat_id
            AND chat_participants.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM chats
          WHERE chats.id = messages.chat_id
            AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
        )
      )
    )
  );
