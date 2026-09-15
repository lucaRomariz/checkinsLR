-- Run inside BEGIN/ROLLBACK after both push migrations. Never run partially.
create temporary table push_test_context (a uuid, b uuid, cat uuid, plan uuid, device uuid, job uuid);
insert into push_test_context(a,b,cat) select gen_random_uuid(),gen_random_uuid(),id from public.categories where active limit 1;
insert into auth.users(id,email,raw_user_meta_data) select a,a||'@example.invalid',jsonb_build_object('username','qa-'||a) from push_test_context;
insert into auth.users(id,email,raw_user_meta_data) select b,b||'@example.invalid',jsonb_build_object('username','qa-'||b) from push_test_context;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
select p.id,'https://fcm.googleapis.com/qa-'||p.id,'test','test' from public.profiles p, push_test_context t where p.auth_user_id in (t.a,t.b);
update push_test_context t set device=s.id from public.push_subscriptions s join public.profiles p on p.id=s.user_id where p.auth_user_id=t.a;
insert into public.planning_items(user_id,category_id,title,planned_date,start_time)
select p.id,t.cat,'QA reminder',(now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::time from public.profiles p,push_test_context t where p.auth_user_id=t.a;
update push_test_context t set plan=p.id from public.planning_items p join public.profiles u on u.id=p.user_id where u.auth_user_id=t.a;
select private.enqueue_agenda_push();
select private.enqueue_agenda_push();
do $$ begin
 if (select count(*) from public.push_deliveries where planning_item_id=(select plan from push_test_context))<>1 then raise exception 'TEST: duplicate or missing reminder'; end if;
 if exists(select 1 from public.push_deliveries d, push_test_context t where d.planning_item_id=t.plan and d.subscription_id<>t.device) then raise exception 'TEST: wrong recipient'; end if;
end $$;
update push_test_context t set job=d.id from public.push_deliveries d where d.planning_item_id=t.plan;
update public.push_deliveries set status='processing' where id=(select job from push_test_context);
do $$ begin
 if public.push_delivery_payload((select job from push_test_context))->>'kind' is distinct from 'agenda' then raise exception 'TEST: missing valid payload'; end if;
end $$;
update public.planning_items set cancelled=true where id=(select plan from push_test_context);
do $$ begin if public.push_delivery_payload((select job from push_test_context)) is not null then raise exception 'TEST: cancelled reminder'; end if; end $$;
update public.planning_items set cancelled=false,planned_date=planned_date+1 where id=(select plan from push_test_context);
do $$ begin if public.push_delivery_payload((select job from push_test_context)) is not null then raise exception 'TEST: rescheduled reminder'; end if; end $$;
update public.planning_items set planned_date=planned_date-1,start_time=null where id=(select plan from push_test_context);
do $$ begin if public.push_delivery_payload((select job from push_test_context)) is not null then raise exception 'TEST: untimed reminder'; end if; end $$;
update public.planning_items p set planned_date=((now()-interval '16 minutes') at time zone 'America/Sao_Paulo')::date,start_time=((now()-interval '16 minutes') at time zone 'America/Sao_Paulo')::time where id=(select plan from push_test_context);
update public.push_deliveries set scheduled_for=now()-interval '16 minutes' where id=(select job from push_test_context);
do $$ begin if public.push_delivery_payload((select job from push_test_context)) is not null then raise exception 'TEST: expired reminder'; end if; end $$;
update public.planning_items set planned_date=(now() at time zone 'America/Sao_Paulo')::date,start_time=(now() at time zone 'America/Sao_Paulo')::time where id=(select plan from push_test_context);
update public.push_deliveries set scheduled_for=now() where id=(select job from push_test_context);
insert into public.checkins(user_id,category_id,title,checkin_date,counts_for_ranking,planning_item_id)
select p.user_id,p.category_id,'QA completed',p.planned_date,false,p.id from public.planning_items p where p.id=(select plan from push_test_context);
do $$ begin if public.push_delivery_payload((select job from push_test_context)) is not null then raise exception 'TEST: completed reminder'; end if; end $$;
set local role authenticated;
do $$ begin
 begin perform public.push_delivery_payload(gen_random_uuid()); raise exception 'TEST: payload exposed'; exception when insufficient_privilege then null; end;
 begin perform private.enqueue_agenda_push(); raise exception 'TEST: enqueue exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: deduplication, owner-only, valid payload, cancelled, rescheduled, untimed, expired, completed, RPC permissions' as result;
