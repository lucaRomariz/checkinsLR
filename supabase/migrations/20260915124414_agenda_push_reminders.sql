-- Agenda reminders reuse delivery leases, retries and subscription ownership.
alter table public.push_deliveries alter column checkin_id drop not null;
alter table public.push_deliveries
  add column planning_item_id uuid references public.planning_items(id) on delete cascade,
  add column scheduled_for timestamptz,
  add constraint push_delivery_source check (
    (checkin_id is not null and planning_item_id is null and scheduled_for is null)
    or (checkin_id is null and planning_item_id is not null and scheduled_for is not null)
  ),
  add constraint push_delivery_plan_device_time unique(planning_item_id, subscription_id, scheduled_for);
create index push_deliveries_plan_idx on public.push_deliveries(planning_item_id);
create index planning_reminders_due_idx on public.planning_items(planned_date, start_time)
  where not cancelled and start_time is not null;

create or replace function private.enqueue_agenda_push()
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Only recent starts: outages must not produce a flood of old reminders.
  insert into public.push_deliveries(planning_item_id, subscription_id, scheduled_for)
  select p.id, s.id, (p.planned_date + p.start_time) at time zone 'America/Sao_Paulo'
  from public.planning_items p
  join public.push_subscriptions s on s.user_id = p.user_id
  where not p.cancelled and p.start_time is not null
    and p.planned_date between ((now()-interval '15 minutes') at time zone 'America/Sao_Paulo')::date
      and (now() at time zone 'America/Sao_Paulo')::date
    and (p.planned_date + p.start_time) at time zone 'America/Sao_Paulo' > now()-interval '15 minutes'
    and (p.planned_date + p.start_time) at time zone 'America/Sao_Paulo' <= now()
    and not exists(select 1 from public.checkins c where c.planning_item_id = p.id)
  on conflict do nothing;
end $$;
revoke all on function private.enqueue_agenda_push() from public, anon, authenticated;

-- Recheck immediately before sending, including ownership, completion and rescheduling.
-- Generic copy deliberately keeps private activity titles off the lock screen.
create or replace function public.push_delivery_payload(p_delivery_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select case when d.checkin_id is not null then
    jsonb_build_object('kind','checkin','url','/checkin/'||d.checkin_id,'tag','checkin-'||d.checkin_id,'ttl',3600)
  else
    jsonb_build_object('kind','agenda','url','/agenda?date='||p.planned_date,
      'tag','agenda-'||p.id,'ttl',greatest(1,extract(epoch from (d.scheduled_for+interval '15 minutes'-now()))::integer))
  end
  from public.push_deliveries d
  join public.push_subscriptions s on s.id=d.subscription_id
  left join public.checkins c on c.id=d.checkin_id
  left join public.planning_items p on p.id=d.planning_item_id
  where d.id=p_delivery_id and d.status='processing'
    and ((c.id is not null and c.user_id<>s.user_id)
      or (p.id is not null and p.user_id=s.user_id and not p.cancelled and p.start_time is not null
        and (p.planned_date+p.start_time) at time zone 'America/Sao_Paulo'=d.scheduled_for
        and d.scheduled_for<=now() and d.scheduled_for>now()-interval '15 minutes'
        and not exists(select 1 from public.checkins done where done.planning_item_id=p.id)))
$$;
revoke all on function public.push_delivery_payload(uuid) from public, anon, authenticated;
grant execute on function public.push_delivery_payload(uuid) to service_role;

-- Reuse the existing minute job instead of adding competing worker wakeups.
select cron.schedule('checkins-web-push-retry','* * * * *',
  'select private.enqueue_agenda_push(); select private.wake_push_worker()');
