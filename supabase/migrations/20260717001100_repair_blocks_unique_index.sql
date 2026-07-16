delete from public.blocks a
using public.blocks b
where a.blocker_id = b.blocker_id
  and a.blocked_id = b.blocked_id
  and a.created_at < b.created_at;

delete from public.blocks a
using public.blocks b
where a.blocker_id = b.blocker_id
  and a.blocked_id = b.blocked_id
  and a.created_at = b.created_at
  and a.id::text < b.id::text;

create unique index if not exists blocks_blocker_id_blocked_id_uidx
on public.blocks (blocker_id, blocked_id);
