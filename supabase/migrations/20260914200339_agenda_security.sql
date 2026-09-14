-- Agenda and security hardening. Existing profiles and check-ins are preserved.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Eliminate automatic administrator promotion while keeping existing roles.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(auth_user_id, username, display_name, role)
  values(new.id, lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''), split_part(new.email,'@',1))),
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), new.raw_user_meta_data->>'username', 'Usuário'), 'USER');
  return new;
end; $$;
alter function public.handle_new_user() set schema private;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- Invoker helpers use the authenticated profile SELECT policy, with no recursion.
alter function public.current_profile_id() security invoker;
alter function public.is_admin() security invoker;

do $$ declare p record; begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('profiles','categories','checkins','checkin_likes','checkin_comments','system_settings') loop
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;
revoke all on public.profiles,public.categories,public.checkins,public.checkin_likes,public.checkin_comments,public.system_settings from anon, authenticated;
grant select on public.profiles,public.categories,public.checkins,public.checkin_likes,public.checkin_comments,public.system_settings to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
grant insert,update,delete on public.categories to authenticated;
grant insert,update on public.system_settings to authenticated;
grant insert,delete on public.checkin_likes to authenticated;
grant insert,delete on public.checkin_comments to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_edit on public.profiles for update to authenticated using (auth_user_id=(select auth.uid())) with check (auth_user_id=(select auth.uid()));
create policy categories_read on public.categories for select to authenticated using (true);
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated using ((select public.is_admin()));
create policy settings_read on public.system_settings for select to authenticated using (true);
create policy settings_admin_insert on public.system_settings for insert to authenticated with check ((select public.is_admin()));
create policy settings_admin_update on public.system_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy checkins_read on public.checkins for select to authenticated using (true);
create policy likes_read on public.checkin_likes for select to authenticated using (true);
create policy likes_insert on public.checkin_likes for insert to authenticated with check (
  user_id=(select public.current_profile_id()) and coalesce((select setting_value='true' from public.system_settings where setting_key='likes_enabled'),true));
create policy likes_delete on public.checkin_likes for delete to authenticated using (user_id=(select public.current_profile_id()));
create policy comments_read on public.checkin_comments for select to authenticated using (true);
create policy comments_insert on public.checkin_comments for insert to authenticated with check (
  user_id=(select public.current_profile_id()) and length(trim(content)) between 1 and 2000
  and coalesce((select setting_value='true' from public.system_settings where setting_key='comments_enabled'),true));
create policy comments_delete on public.checkin_comments for delete to authenticated using (user_id=(select public.current_profile_id()) or (select public.is_admin()));

create table public.planning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null check(length(trim(title)) between 1 and 160),
  notes text check(length(notes)<=4000),
  planned_date date not null,
  start_time time, end_time time,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(end_time is null or start_time is null or end_time>=start_time)
);
alter table public.planning_items enable row level security;
revoke all on public.planning_items from anon,authenticated;
grant select on public.planning_items to authenticated;
create policy planning_read_own on public.planning_items for select to authenticated using(user_id=(select public.current_profile_id()));
create index planning_user_date_idx on public.planning_items(user_id,planned_date,start_time,id);
create index planning_category_idx on public.planning_items(category_id);
alter table public.checkins add column planning_item_id uuid unique references public.planning_items(id);
alter table public.checkins add column request_id uuid;
create unique index checkins_user_request_idx on public.checkins(user_id,request_id) where request_id is not null;
alter table public.checkins alter column checkin_date set default (now() at time zone 'America/Sao_Paulo')::date;
create index checkins_feed_idx on public.checkins(created_at desc,id desc);
create index checkins_user_feed_idx on public.checkins(user_id,created_at desc,id desc);
create index comments_checkin_date_idx on public.checkin_comments(checkin_id,created_at,id);
create index comments_user_idx on public.checkin_comments(user_id);
create index likes_user_idx on public.checkin_likes(user_id);
create index settings_editor_idx on public.system_settings(updated_by);

create function private.save_plan(p_id uuid,p_category_id uuid,p_title text,p_notes text,p_date date,p_start time,p_end time,p_cancelled boolean)
returns public.planning_items language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_row public.planning_items;
begin
  v_user:=public.current_profile_id();
  if auth.uid() is null or v_user is null then raise exception 'Entre na sua conta para planejar.'; end if;
  if p_date is null or p_title is null or length(trim(p_title)) not between 1 and 160 then raise exception 'Informe título e data válidos.'; end if;
  if not exists(select 1 from public.categories where id=p_category_id and active) then raise exception 'Escolha uma categoria ativa.'; end if;
  if p_id is not null then
    select * into v_row from public.planning_items where id=p_id and user_id=v_user for update;
    if not found then raise exception 'Atividade não encontrada.'; end if;
    if exists(select 1 from public.checkins where planning_item_id=p_id) then raise exception 'Uma atividade concluída não pode ser alterada. Exclua o check-in para reabri-la.'; end if;
    update public.planning_items set category_id=p_category_id,title=trim(p_title),notes=nullif(trim(p_notes),''),planned_date=p_date,
      start_time=p_start,end_time=p_end,cancelled=coalesce(p_cancelled,false),updated_at=now() where id=p_id returning * into v_row;
  else
    perform pg_advisory_xact_lock(hashtextextended('plan:'||v_user::text||p_date::text,0));
    if (select count(*) from public.planning_items where user_id=v_user and planned_date=p_date)>=50 then raise exception 'Limite de 50 atividades por dia atingido.'; end if;
    insert into public.planning_items(user_id,category_id,title,notes,planned_date,start_time,end_time)
    values(v_user,p_category_id,trim(p_title),nullif(trim(p_notes),''),p_date,p_start,p_end) returning * into v_row;
  end if;
  return v_row;
end; $$;
create function public.save_plan(p_id uuid,p_category_id uuid,p_title text,p_notes text,p_date date,p_start time,p_end time,p_cancelled boolean default false)
returns public.planning_items language sql security invoker set search_path='' as $$
  select private.save_plan(p_id,p_category_id,p_title,p_notes,p_date,p_start,p_end,p_cancelled);
$$;

create function private.record_checkin(p_category_id uuid,p_title text,p_description text,p_image_url text,p_start_time time,p_end_time time,p_planning_item_id uuid,p_request_id uuid)
returns public.checkins language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
  v_plan public.planning_items; v_cat public.categories; v_row public.checkins; v_count int; v_rank boolean:=false;
begin
  v_user:=public.current_profile_id();
  if auth.uid() is null or v_user is null then raise exception 'Entre na sua conta para fazer check-in.'; end if;
  -- One lock order for every completion: owner/day, then occurrence.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||v_today::text,0));
  if p_request_id is not null then
    select * into v_row from public.checkins where user_id=v_user and request_id=p_request_id;
    if found then return v_row; end if;
  end if;
  if p_planning_item_id is not null then
    select * into v_plan from public.planning_items where id=p_planning_item_id and user_id=v_user for update;
    if not found then raise exception 'Atividade não encontrada.'; end if;
    select * into v_row from public.checkins where planning_item_id=p_planning_item_id;
    if found then return v_row; end if;
    if v_plan.cancelled then raise exception 'Reative a atividade antes de fazer check-in.'; end if;
    if v_plan.planned_date>v_today then raise exception 'Esta atividade está planejada para um dia futuro.'; end if;
    if v_plan.category_id<>p_category_id then raise exception 'A categoria deve corresponder ao planejamento.'; end if;
  end if;
  if length(p_title)>160 or length(p_description)>4000 then raise exception 'Título ou descrição acima do limite.'; end if;
  if p_end_time<p_start_time then raise exception 'O término deve ser igual ou posterior ao início.'; end if;
  if p_image_url is not null and p_image_url not like 'https://ktcqiaqxamzhjcsbycqq.supabase.co/storage/v1/object/public/checkin-images/'||auth.uid()::text||'/%' then
    raise exception 'Imagem inválida. Envie uma foto pela sua conta.';
  end if;
  select * into v_cat from public.categories where id=p_category_id and active;
  if not found then raise exception 'Escolha uma categoria ativa.'; end if;
  select count(*) into v_count from public.checkins where user_id=v_user and checkin_date=v_today;
  if v_count>=100 then raise exception 'Limite de segurança diário atingido.'; end if;
  -- Planned completion is independent from the free-post allowance and ranking points.
  if p_planning_item_id is null then
    select count(*) into v_count from public.checkins where user_id=v_user and checkin_date=v_today and planning_item_id is null;
    if v_count>=coalesce((select setting_value::int from public.system_settings where setting_key='daily_post_limit'),5) then raise exception 'Limite diário de check-ins avulsos atingido.'; end if;
    if v_cat.daily_limit is not null and (select count(*) from public.checkins where user_id=v_user and checkin_date=v_today and category_id=p_category_id and planning_item_id is null)>=v_cat.daily_limit then
      raise exception 'Limite diário de check-ins avulsos nesta categoria atingido.';
    end if;
  end if;
  if v_cat.ranking_enabled and coalesce((select setting_value='true' from public.system_settings where setting_key='ranking_enabled'),true) then
    select count(*) into v_count from public.checkins where user_id=v_user and checkin_date=v_today and counts_for_ranking;
    v_rank:=v_count<coalesce((select setting_value::int from public.system_settings where setting_key='daily_ranking_limit'),1);
  end if;
  insert into public.checkins(user_id,category_id,title,description,image_url,checkin_date,counts_for_ranking,start_time,end_time,planning_item_id,request_id)
  values(v_user,p_category_id,coalesce(nullif(trim(p_title),''),v_plan.title),nullif(trim(p_description),''),p_image_url,v_today,v_rank,p_start_time,p_end_time,p_planning_item_id,p_request_id)
  returning * into v_row;
  return v_row;
end; $$;
create function public.record_checkin(p_category_id uuid,p_title text default null,p_description text default null,p_image_url text default null,p_start_time time default null,p_end_time time default null,p_planning_item_id uuid default null,p_request_id uuid default null)
returns public.checkins language sql security invoker set search_path='' as $$
select private.record_checkin(p_category_id,p_title,p_description,p_image_url,p_start_time,p_end_time,p_planning_item_id,p_request_id);
$$;
create or replace function public.create_checkin(p_category_id uuid,p_title text default null,p_description text default null,p_image_url text default null,p_start_time time default null,p_end_time time default null)
returns public.checkins language sql security invoker set search_path='' as $$
select private.record_checkin(p_category_id,p_title,p_description,p_image_url,p_start_time,p_end_time,null,null);
$$;
create function private.delete_checkin(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_row public.checkins; v_user uuid;
begin
  v_user:=public.current_profile_id();
  if auth.uid() is null or v_user is null then raise exception 'Entre na sua conta.'; end if;
  select * into v_row from public.checkins where id=p_id and (user_id=v_user or public.is_admin());
  if not found then raise exception 'Check-in não encontrado.'; end if;
  if v_row.planning_item_id is not null then perform 1 from public.planning_items where id=v_row.planning_item_id for update; end if;
  delete from public.checkins where id=p_id;
end; $$;
create function public.delete_checkin(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.delete_checkin(p_id);$$;

-- Bounded feed, aggregate counts instead of transferring all interaction IDs.
create function public.get_feed(p_before timestamptz default null,p_before_id uuid default null,p_user_id uuid default null,p_checkin_id uuid default null)
returns setof jsonb language sql stable security invoker set search_path='' as $$
select to_jsonb(c)-'request_id' || jsonb_build_object(
 'profiles',jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name),
 'categories',jsonb_build_object('id',cat.id,'name',cat.name,'icon',cat.icon,'color',cat.color),
 'like_count',(select count(*) from public.checkin_likes l where l.checkin_id=c.id),
 'comment_count',(select count(*) from public.checkin_comments m where m.checkin_id=c.id),
 'liked',exists(select 1 from public.checkin_likes l where l.checkin_id=c.id and l.user_id=(select public.current_profile_id())))
from (select * from public.checkins
 where (p_before is null or (created_at,id)<(p_before,p_before_id))
 and (p_user_id is null or user_id=p_user_id) and (p_checkin_id is null or id=p_checkin_id)
 order by created_at desc,id desc limit 21) c
join public.profiles p on p.id=c.user_id join public.categories cat on cat.id=c.category_id
order by c.created_at desc,c.id desc;
$$;

-- Private bucket; clients store a stable locator and receive short-lived signed URLs.
update storage.buckets set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='checkin-images';
drop policy if exists checkin_images_public_read on storage.objects;
drop policy if exists checkin_images_auth_upload on storage.objects;
create policy checkin_images_read on storage.objects for select to authenticated using(bucket_id='checkin-images');
create policy checkin_images_upload on storage.objects for insert to authenticated with check(bucket_id='checkin-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Restrict exposed functions to signed-in users. Trigger functions are not API endpoints.
revoke execute on all functions in schema public from public,anon;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.save_plan(uuid,uuid,text,text,date,time,time,boolean),private.record_checkin(uuid,text,text,text,time,time,uuid,uuid),private.delete_checkin(uuid) to authenticated;
grant execute on function public.save_plan(uuid,uuid,text,text,date,time,time,boolean),public.record_checkin(uuid,text,text,text,time,time,uuid,uuid),public.delete_checkin(uuid),public.get_feed(timestamptz,uuid,uuid,uuid) to authenticated;

-- Aggregate readers obey RLS and use the same local day as check-ins.
CREATE OR REPLACE FUNCTION public.get_ranking(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_category_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, checkin_count bigint)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(c.id) as checkin_count
  from public.checkins c
  join public.profiles p on p.id = c.user_id
  where c.counts_for_ranking = true and coalesce((select setting_value='true' from public.system_settings where setting_key='ranking_enabled'),true)
    and (p_start_date is null or c.checkin_date >= p_start_date)
    and (p_end_date is null or c.checkin_date <= p_end_date)
    and (p_category_id is null or c.category_id = p_category_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by checkin_count desc, p.display_name asc;
$function$
;
CREATE OR REPLACE FUNCTION public.get_streak(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_streak int := 0;
  v_cursor date := (timezone('America/Sao_Paulo', now()))::date;
  v_has_today boolean;
begin
  select exists(
    select 1 from public.checkins
    where user_id = p_user_id and checkin_date = v_cursor and counts_for_ranking = true
  ) into v_has_today;

  if not v_has_today then
    v_cursor := v_cursor - 1; -- allow streak to still show if today just hasn't happened yet
  end if;

  loop
    exit when not exists (
      select 1 from public.checkins
      where user_id = p_user_id and checkin_date = v_cursor and counts_for_ranking = true
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_streak;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_category_stats(p_user_id uuid)
 RETURNS TABLE(category_id uuid, category_name text, icon text, color text, checkin_count bigint)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  select
    cat.id, cat.name, cat.icon, cat.color, count(c.id) as checkin_count
  from public.categories cat
  left join public.checkins c on c.category_id = cat.id and c.user_id = p_user_id
  group by cat.id, cat.name, cat.icon, cat.color, cat.sort_order
  order by cat.sort_order;
$function$
;
CREATE OR REPLACE FUNCTION public.get_couple_streak(p_user_a uuid, p_user_b uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_streak int := 0;
  v_cursor date := (timezone('America/Sao_Paulo', now()))::date;
  v_has_today boolean;
begin
  select exists(
    select 1 from public.checkins where user_id = p_user_a and checkin_date = v_cursor and counts_for_ranking = true
  ) and exists(
    select 1 from public.checkins where user_id = p_user_b and checkin_date = v_cursor and counts_for_ranking = true
  ) into v_has_today;

  if not v_has_today then
    v_cursor := v_cursor - 1;
  end if;

  loop
    exit when not (
      exists (select 1 from public.checkins where user_id = p_user_a and checkin_date = v_cursor and counts_for_ranking = true)
      and exists (select 1 from public.checkins where user_id = p_user_b and checkin_date = v_cursor and counts_for_ranking = true)
    );
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_streak;
end;
$function$
;

grant execute on function public.current_profile_id(),public.is_admin(),public.create_checkin(uuid,text,text,text,time,time),public.get_ranking(date,date,uuid),public.get_streak(uuid),public.get_category_stats(uuid),public.get_couple_streak(uuid,uuid) to authenticated;

-- Validate administrator inputs on the database, not just in the form.
create function private.validate_setting() returns trigger language plpgsql set search_path='' as $$
begin
  if new.setting_key in ('daily_post_limit','daily_ranking_limit') and
    (new.setting_value !~ '^[0-9]{1,3}$' or new.setting_value::int not between 1 and 100) then
    raise exception 'O limite deve ser um número inteiro entre 1 e 100.';
  end if;
  if new.setting_key in ('ranking_enabled','ranking_by_category','likes_enabled','comments_enabled') and new.setting_value not in ('true','false') then raise exception 'Valor de configuração inválido.'; end if;
  if new.setting_key='ranking_default_period' and new.setting_value not in ('today','week','month','all') then raise exception 'Período inválido.'; end if;
  new.updated_at:=now();new.updated_by:=public.current_profile_id();
  return new;
end; $$;
revoke all on function private.validate_setting() from public,anon,authenticated;
create trigger validate_setting before insert or update on public.system_settings for each row execute function private.validate_setting();
alter table public.categories add constraint category_daily_limit_valid check(daily_limit is null or daily_limit between 1 and 100) not valid;
