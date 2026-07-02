-- Preserve chat rooms when courts or host profiles are deleted.
-- Chat visibility is controlled by participant status, not by court/profile existence.

begin;

alter table public.court_group_chats
  drop constraint if exists court_group_chats_court_id_fkey;

alter table public.court_group_chats
  alter column court_id drop not null;

alter table public.court_group_chats
  add constraint court_group_chats_court_id_fkey
  foreign key (court_id)
  references public.courts(id)
  on delete set null;

alter table public.group_chats
  drop constraint if exists group_chats_court_id_fkey;

alter table public.group_chats
  alter column court_id drop not null;

alter table public.group_chats
  add constraint group_chats_court_id_fkey
  foreign key (court_id)
  references public.courts(id)
  on delete set null;

alter table public.group_chats
  drop constraint if exists group_chats_host_id_fkey;

alter table public.group_chats
  alter column host_id drop not null;

alter table public.group_chats
  add constraint group_chats_host_id_fkey
  foreign key (host_id)
  references public.profiles(user_id)
  on delete set null;

commit;
