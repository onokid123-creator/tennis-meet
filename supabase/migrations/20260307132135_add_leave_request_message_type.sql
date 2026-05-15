/*
  # Add leave_request message type support

  This migration adds leave_request tracking to both direct and group chats.

  1. Changes
    - Adds `leave_requests` table to track pending leave requests
    - Stores: chat_id or group_chat_id, requester_id, reason, status (pending/accepted/rejected)

  2. Security
    - Enable RLS on leave_requests
    - Authenticated users can insert their own requests
    - Authenticated users can read requests for their chats
    - Only host (room creator) can update status
*/

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  group_chat_id uuid REFERENCES court_group_chats(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Authenticated users can read leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = leave_requests.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM court_group_chats
      WHERE court_group_chats.id = leave_requests.group_chat_id
      AND court_group_chats.host_id = auth.uid()
    )
  );

CREATE POLICY "Host can update leave request status"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = leave_requests.chat_id
      AND chats.user1_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM court_group_chats
      WHERE court_group_chats.id = leave_requests.group_chat_id
      AND court_group_chats.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = leave_requests.chat_id
      AND chats.user1_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM court_group_chats
      WHERE court_group_chats.id = leave_requests.group_chat_id
      AND court_group_chats.host_id = auth.uid()
    )
  );
