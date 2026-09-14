
-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'ADMIN'
  );
$$;

-- Helper: get current user's profile id
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

-- Auto-create profile on signup. The two initial usernames are auto-promoted to ADMIN.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
  new_display_name text;
  new_role text := 'USER';
begin
  new_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  new_display_name := coalesce(new.raw_user_meta_data->>'display_name', new_username);

  if new_username in ('luca.romariz', 'roberta.araujo') then
    new_role := 'ADMIN';
  end if;

  insert into public.profiles (auth_user_id, username, display_name, role)
  values (new.id, new_username, new_display_name, new_role);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

