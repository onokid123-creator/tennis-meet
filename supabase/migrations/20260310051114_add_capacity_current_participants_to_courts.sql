/*
  # Add capacity and current_participants to courts

  ## Changes
  - Adds `capacity` column (total slots = male_slots + female_slots)
  - Adds `current_participants` column (confirmed count, starts at 0)

  Both are derived/tracked values used for real-time participant counting.
*/

ALTER TABLE courts
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_participants integer DEFAULT 0;

-- Backfill capacity from existing slot data
UPDATE courts
SET capacity = COALESCE(male_slots, 0) + COALESCE(female_slots, 0)
WHERE capacity = 0 AND (male_slots IS NOT NULL OR female_slots IS NOT NULL);
