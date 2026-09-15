-- Push delivery is asynchronous. Secrets live in Vault, never in the frontend.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create policy push_subscriptions_owner_read on public.push_subscriptions for select to authenticated using (user_id = (select public.current_profile_id()));
create policy push_subscriptions_owner_delete on public.push_subscriptions for delete to authenticated using (user_id = (select public.current_profile_id()));

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_status integer,
  unique(checkin_id, subscription_id)
);
create index push_deliveries_due_idx on public.push_deliveries(available_at) where status in ('pending','processing');
create index push_deliveries_subscription_idx on public.push_deliveries(subscription_id);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;
grant all on public.push_deliveries to service_role;

create or replace function private.register_push_subscription(p_subscription jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_endpoint text := p_subscription->>'endpoint';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into strict v_user from public.profiles where auth_user_id = auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 18));
  if v_endpoint is null or length(v_endpoint) > 2048 or v_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
     or coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^[A-Za-z0-9_-]{87}$'
     or coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{22}$' then
    raise exception 'Invalid push subscription';
  end if;
  if (select count(*) from public.push_subscriptions where user_id=v_user) >= 10
    and not exists(select 1 from public.push_subscriptions where user_id=v_user and endpoint=v_endpoint) then
    raise exception 'Device limit reached';
  end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
  values(v_user,v_endpoint,p_subscription#>>'{keys,p256dh}',p_subscription#>>'{keys,auth}')
  on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth
  where public.push_subscriptions.user_id=v_user;
  if not found then raise exception 'Subscription belongs to another account'; end if;
end $$;
revoke all on function private.register_push_subscription(jsonb) from public, anon, authenticated;
grant execute on function private.register_push_subscription(jsonb) to authenticated;
create or replace function public.register_push_subscription(p_subscription jsonb)
returns void language sql security invoker set search_path = '' as $$ select private.register_push_subscription(p_subscription) $$;
revoke all on function public.register_push_subscription(jsonb) from public, anon;
grant execute on function public.register_push_subscription(jsonb) to authenticated;

create or replace function private.get_push_public_key()
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name='web_push_public_key');
end $$;
revoke all on function private.get_push_public_key() from public, anon;
grant execute on function private.get_push_public_key() to authenticated;
create or replace function public.get_push_public_key()
returns text language sql security invoker set search_path = '' as $$ select private.get_push_public_key() $$;
revoke all on function public.get_push_public_key() from public, anon;
grant execute on function public.get_push_public_key() to authenticated;

-- Invoked only by the Edge Function with service credentials and a separate worker secret.
create or replace function private.push_worker_config(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name='web_push_worker_secret') then return null; end if;
  return jsonb_build_object(
    'publicKey',(select decrypted_secret from vault.decrypted_secrets where name='web_push_public_key'),
    'privateKey',(select decrypted_secret from vault.decrypted_secrets where name='web_push_private_key'),
    'subject',(select decrypted_secret from vault.decrypted_secrets where name='web_push_subject'));
end $$;
revoke all on function private.push_worker_config(text) from public, anon, authenticated;
grant execute on function private.push_worker_config(text) to service_role;
create or replace function public.push_worker_config(p_secret text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.push_worker_config(p_secret) $$;
revoke all on function public.push_worker_config(text) from public, anon, authenticated;
grant execute on function public.push_worker_config(text) to service_role;
grant usage on schema private to service_role;

create or replace function public.claim_push_deliveries()
returns setof public.push_deliveries language sql security invoker set search_path = '' as $$
  update public.push_deliveries set status='processing', attempts=attempts+1, available_at=now()+interval '3 minutes'
  where id in (
    select id from public.push_deliveries where status in ('pending','processing') and available_at <= now() and attempts < 5
    order by available_at limit 25 for update skip locked
  ) returning *;
$$;
revoke all on function public.claim_push_deliveries() from public, anon, authenticated;
grant execute on function public.claim_push_deliveries() to service_role;

create or replace function private.wake_push_worker()
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  if not exists(select 1 from public.push_deliveries where status in ('pending','processing') and available_at <= now() and attempts < 5) then return; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name='web_push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='web_push_worker_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(url:=v_url,headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',v_secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function private.wake_push_worker() from public, anon, authenticated;

create or replace function private.enqueue_checkin_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The current feed is shared with all signed-in profiles; plans remain private.
  insert into public.push_deliveries(checkin_id, subscription_id)
  select new.id, s.id from public.push_subscriptions s where s.user_id <> new.user_id
  on conflict do nothing;
  -- pg_net dispatches after commit. A networking failure is retried by cron.
  begin perform private.wake_push_worker(); exception when others then null; end;
  return new;
end $$;
revoke all on function private.enqueue_checkin_push() from public, anon, authenticated;
create trigger checkin_web_push after insert on public.checkins for each row execute function private.enqueue_checkin_push();

select cron.schedule('checkins-web-push-retry','* * * * *','select private.wake_push_worker()');
select cron.schedule('checkins-web-push-cleanup','17 3 * * *', $job$
  delete from public.push_deliveries where created_at < now()-interval '7 days';
  update public.push_deliveries set status='failed' where status='processing' and attempts>=5 and available_at<now();
$job$);
