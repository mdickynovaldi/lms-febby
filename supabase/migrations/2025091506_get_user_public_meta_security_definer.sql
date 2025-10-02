-- Recreate RPC with security definer so it can read auth.users
drop function if exists public.get_user_public_meta(uuid[]);

create function public.get_user_public_meta(user_ids uuid[])
returns table (
  id uuid,
  name text,
  nim text,
  role text
) language sql stable security definer as $$
  select
    u.id,
    coalesce((u.raw_user_meta_data->>'name')::text, null) as name,
    coalesce((u.raw_user_meta_data->>'nim')::text, null) as nim,
    coalesce((u.raw_user_meta_data->>'role')::text, null) as role
  from auth.users u
  where u.id = any(user_ids);
$$;

revoke all on function public.get_user_public_meta(uuid[]) from public;
grant execute on function public.get_user_public_meta(uuid[]) to authenticated;

