/*
  # Add sender_seen column to meal_proposals

  ## Summary
  Adds a `sender_seen` boolean column to the `meal_proposals` table so that
  when a receiver accepts or rejects a meal proposal, the sender (host) can
  see the result notification in the Applications screen and the BottomNav badge.

  ## Changes
  - `meal_proposals`: add `sender_seen` (boolean, default false) — false means
    the sender has not yet seen the accepted/rejected result.

  ## Notes
  - Existing rows get `sender_seen = false` by default (they are pending so no result yet).
  - No data loss. No destructive operations.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_proposals' AND column_name = 'sender_seen'
  ) THEN
    ALTER TABLE meal_proposals ADD COLUMN sender_seen boolean NOT NULL DEFAULT false;
  END IF;
END $$;
