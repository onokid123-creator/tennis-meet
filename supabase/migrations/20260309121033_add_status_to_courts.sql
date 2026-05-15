/*
  # Add status column to courts table

  1. Changes
    - Adds `status` column (text) to `courts` table
    - Default value: 'open'
    - Used for auto-closing recruitment when capacity is reached ('closed')
*/

ALTER TABLE courts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
