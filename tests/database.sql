begin;
-- Fixtures live only in this rollback transaction. No sign-up email is sent.
create temporary table test_context(a uuid,b uuid,plan uuid,cat uuid,checkin uuid);
insert into test_context(a,b,cat) select gen_random_uuid(),gen_random_uuid(),id from public.categories where active limit 1;
insert into auth.users(id,email,raw_user_meta_data) select a,a::text||'@example.invalid',jsonb_build_object('username','test-'||a::text) from test_context;
insert into auth.users(id,email,raw_user_meta_data) select b,b::text||'@example.invalid',jsonb_build_object('username','test-'||b::text) from test_context;
grant all on test_context to authenticated;
select set_config('request.jwt.claim.sub',(select a::text from test_context),true);
set local role authenticated;
do $$ declare p public.planning_items; c public.checkins; c2 public.checkins; begin
  if public.is_admin() then raise exception 'TEST: signup must not grant ADMIN'; end if;
  p := public.save_plan(null,(select cat from test_context),'Teste agenda','', (now() at time zone 'America/Sao_Paulo')::date,null,null,false);
  update test_context set plan=p.id;
  c := public.record_checkin((select cat from test_context),'Teste',null,null,null,null,p.id,gen_random_uuid());
  c2 := public.record_checkin((select cat from test_context),'Teste',null,null,null,null,p.id,gen_random_uuid());
  if c.id<>c2.id then raise exception 'TEST: duplicate occurrence'; end if;
  if c.checkin_date<>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'TEST: wrong day'; end if;
  update test_context set checkin=c.id;
  begin
    perform public.save_plan(p.id,p.category_id,'Alterado','',p.planned_date,null,null,false);
    raise exception 'TEST: completed plan was edited';
  exception when raise_exception then
    if sqlerrm like 'TEST:%' then raise; end if;
  end;
  begin
    insert into public.checkins(user_id,category_id,counts_for_ranking) values(public.current_profile_id(),p.category_id,true);
    raise exception 'TEST: direct insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from test_context),true);
do $$ begin
  if exists(select 1 from public.planning_items) then raise exception 'TEST: other owner can read plan'; end if;
  begin
    perform public.record_checkin(cat,'Intruso',null,null,null,null,plan,gen_random_uuid()) from test_context;
    raise exception 'TEST: other owner can complete plan';
  exception when raise_exception then
    if sqlerrm like 'TEST:%' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from test_context),true);
select public.delete_checkin(checkin) from test_context;
do $$ begin
  if exists(select 1 from public.checkins where planning_item_id=(select plan from test_context)) then raise exception 'TEST: deletion did not reopen plan'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform count(*) from public.profiles; raise exception 'TEST: anonymous read'; exception when insufficient_privilege then null; end;
  begin perform public.get_ranking(); raise exception 'TEST: anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: ownership, idempotency, direct write protection, local date, deletion, anonymous access' result;

rollback;
