/*
  # Add on_profile_deleted trigger

  ## Summary
  profiles 행이 삭제될 때 auth.users에서도 해당 계정을 자동 삭제하는 트리거를 생성합니다.

  ## Details
  1. New Function
    - `handle_profile_deleted()` - SECURITY DEFINER 함수로, profiles 삭제 시 auth.users에서 해당 user_id를 삭제
  2. New Trigger
    - `on_profile_deleted` - profiles 테이블의 DELETE 이후에 위 함수를 실행

  ## Notes
  - Edge Function(delete-user-account)이 정상 호출되면 이 트리거가 실행될 일은 없음
  - 만약 직접 profiles 행이 삭제되는 비정상 경로에도 auth 계정이 반드시 정리되도록 보장
*/

CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;

CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_deleted();
