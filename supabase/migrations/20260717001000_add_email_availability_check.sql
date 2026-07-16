create or replace function public.check_email_available(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $function$
begin
  if p_email is null
     or length(trim(p_email)) = 0
     or p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  then
    return false;
  end if;

  return not exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
end;
$function$;

revoke all on function public.check_email_available(text) from public;
grant execute on function public.check_email_available(text) to anon;
grant execute on function public.check_email_available(text) to authenticated;
