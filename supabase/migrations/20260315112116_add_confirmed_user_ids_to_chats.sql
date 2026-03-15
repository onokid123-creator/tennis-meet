/*
  # Add confirmed_user_ids to chats table

  ## Summary
  Adds a `confirmed_user_ids` UUID array column to the `chats` table so that
  confirmed participants in 1:1 (single) chat rooms can be persisted to the
  database and restored on re-entry, just like `group_chats.confirmed_user_ids`.

  ## Changes
  - `chats` table: adds `confirmed_user_ids uuid[] DEFAULT '{}'` column

  ## Notes
  - No data is lost; existing rows get an empty array as default
  - No RLS changes needed; existing policies cover the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'confirmed_user_ids'
  ) THEN
    ALTER TABLE chats ADD COLUMN confirmed_user_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
