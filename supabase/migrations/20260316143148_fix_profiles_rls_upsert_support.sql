/*
  # Fix profiles RLS for upsert support

  ## Problem
  The upsert operation (INSERT ON CONFLICT DO UPDATE) requires both INSERT and UPDATE
  permissions. The existing policies exist but the UPDATE policy's USING clause
  may block the upsert when the row was created by the trigger (handle_new_user)
  which runs as postgres/service role, not the authenticated user.

  ## Changes
  - Drop and recreate INSERT policy to ensure it covers upsert INSERT path
  - Drop and recreate UPDATE policy to ensure it covers upsert UPDATE path
  - Both policies use auth.uid() = user_id check
*/

DROP POLICY IF EXISTS "사용자는 본인 프로필 생성 가능" ON public.profiles;
DROP POLICY IF EXISTS "사용자는 본인 프로필 수정 가능" ON public.profiles;

CREATE POLICY "사용자는 본인 프로필 생성 가능"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 본인 프로필 수정 가능"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
