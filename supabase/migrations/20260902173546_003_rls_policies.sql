
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_likes enable row level security;
alter table public.checkin_comments enable row level security;
alter table public.system_settings enable row level security;

-- PROFILES
create policy profiles_select_all on public.profiles
  for select using (true);

create policy profiles_update_own on public.profiles
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid() and role = (select role from public.profiles p where p.auth_user_id = auth.uid()));

create policy profiles_admin_update_any on public.profiles
  for update using (public.is_admin());

-- CATEGORIES
create policy categories_select_all on public.categories
  for select using (true);

create policy categories_admin_write on public.categories
  for insert with check (public.is_admin());
create policy categories_admin_update on public.categories
  for update using (public.is_admin());
create policy categories_admin_delete on public.categories
  for delete using (public.is_admin());

-- CHECKINS
create policy checkins_select_all on public.checkins
  for select using (true);

create policy checkins_insert_own on public.checkins
  for insert with check (user_id = public.current_profile_id());

create policy checkins_update_own_or_admin on public.checkins
  for update using (user_id = public.current_profile_id() or public.is_admin());

create policy checkins_delete_own_or_admin on public.checkins
  for delete using (user_id = public.current_profile_id() or public.is_admin());

-- LIKES
create policy likes_select_all on public.checkin_likes
  for select using (true);
create policy likes_insert_own on public.checkin_likes
  for insert with check (user_id = public.current_profile_id());
create policy likes_delete_own on public.checkin_likes
  for delete using (user_id = public.current_profile_id());

-- COMMENTS
create policy comments_select_all on public.checkin_comments
  for select using (true);
create policy comments_insert_own on public.checkin_comments
  for insert with check (user_id = public.current_profile_id());
create policy comments_update_own on public.checkin_comments
  for update using (user_id = public.current_profile_id());
create policy comments_delete_own_or_admin on public.checkin_comments
  for delete using (user_id = public.current_profile_id() or public.is_admin());

-- SYSTEM SETTINGS
create policy settings_select_all on public.system_settings
  for select using (true);
create policy settings_admin_write on public.system_settings
  for insert with check (public.is_admin());
create policy settings_admin_update on public.system_settings
  for update using (public.is_admin());

