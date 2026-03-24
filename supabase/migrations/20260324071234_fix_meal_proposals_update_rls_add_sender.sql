/*
  # Fix meal_proposals UPDATE RLS to allow sender updates

  ## Problem
  The current UPDATE policy only allows receiver to update meal_proposals.
  This blocks sender from:
  - Setting sender_seen = true (dismissing result notifications)
  - Setting sender_deleted = true (deleting sent pending proposals)

  So DB updates silently fail, state-only removal disappears on re-entry.

  ## Changes
  - Drop the existing receiver-only UPDATE policy
  - Add two separate UPDATE policies:
    1. receiver can update (status, rejection_reason, receiver_deleted)
    2. sender can update (sender_seen, sender_deleted)
*/

DROP POLICY IF EXISTS "식사 제안 수락/거절: receiver 본인" ON meal_proposals;

CREATE POLICY "식사 제안 업데이트: receiver 본인"
  ON meal_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "식사 제안 업데이트: sender 본인"
  ON meal_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
