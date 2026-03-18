/*
  # Fix courts RLS - restrict UPDATE and DELETE to court owner only

  ## Changes
  - Drop the overly permissive `courts_all` policy (USING true, allows everyone everything)
  - Add 4 separate policies:
    - SELECT: any authenticated user can read courts
    - INSERT: authenticated user can insert, user_id must match their own id
    - UPDATE: only the court owner (user_id = auth.uid()) can update
    - DELETE: only the court owner (user_id = auth.uid()) can delete

  ## Security
  - Prevents non-owners from modifying or deleting other users' courts
*/

DROP POLICY IF EXISTS "courts_all" ON courts;

CREATE POLICY "courts_select_any_authenticated"
  ON courts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courts_insert_own"
  ON courts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "courts_update_own"
  ON courts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "courts_delete_own"
  ON courts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
