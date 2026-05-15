/*
  # Fix court foreign key constraints to use ON DELETE CASCADE

  ## Problem
  When deleting a court, Postgres throws a FK violation error because:
  - applications.court_id references courts(id) without ON DELETE CASCADE
  - group_chats.court_id references courts(id) without ON DELETE CASCADE

  ## Changes
  - Drop and recreate applications_court_id_fkey with ON DELETE CASCADE
  - Drop and recreate group_chats_court_id_fkey with ON DELETE CASCADE

  ## Effect
  Deleting a court will now automatically delete:
  - All applications referencing that court
  - All group_chats referencing that court
  (chats.court_id and court_group_chats.court_id already have CASCADE/SET NULL)
*/

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_court_id_fkey;

ALTER TABLE applications
  ADD CONSTRAINT applications_court_id_fkey
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE;

ALTER TABLE group_chats
  DROP CONSTRAINT IF EXISTS group_chats_court_id_fkey;

ALTER TABLE group_chats
  ADD CONSTRAINT group_chats_court_id_fkey
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE;
