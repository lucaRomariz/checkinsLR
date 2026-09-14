
-- Fix mutable search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user should only ever run as a trigger, never be callable directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- These are safe for authenticated users (rely on auth.uid()), but should not be reachable by anon
revoke execute on function public.is_admin() from anon;
revoke execute on function public.current_profile_id() from anon;
revoke execute on function public.create_checkin(uuid, text, text, text) from anon;

