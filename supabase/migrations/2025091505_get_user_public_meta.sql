-- Create RPC to fetch public user meta (name, nim) by user ids
create or replace function public.get_user_public_meta(user_ids uuid[])
returns table (
  id uuid,
  name text,
  nim text,
  role text
) language sql stable as $$
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

