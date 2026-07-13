-- Preserve courts, profiles, applications, interests, chats, and messages
-- while hiding deleted resources from normal application flows.

alter table public.courts
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

alter table public.court_interests
  add column if not exists sender_deleted boolean not null default false,
  add column if not exists receiver_deleted boolean not null default false;

alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text;

drop function if exists public.delete_user_completely();

create function public.delete_user_completely()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_updated_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set
    deleted_at = now(),
    deleted_reason = 'user_requested',
    name = '탈퇴한 사용자',
    age = null,
    gender = null,
    experience = null,
    tennis_style = null,
    purpose = null,
    profile_completed = false,
    photo_url = null,
    photo_urls = array[]::text[],
    bio = null,
    mbti = null,
    height = null,
    tennis_photo_url = null,
    phone_number = null,
    fcm_token = null,
    dating_photo_visibility = 'public',
    dating_representative_photo_url = null,
    activity_region = null,
    tennis_profile_completed = false,
    dating_profile_completed = false
  where user_id = v_user_id
     or id = v_user_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'profile_not_found_for_user:%', v_user_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'updated_count', v_updated_count
  );
end;
$function$;

revoke all on function public.delete_user_completely() from public;
grant execute on function public.delete_user_completely() to authenticated;
