begin;
create temporary table test_context(a uuid,cat uuid);
insert into test_context select gen_random_uuid(),id from public.categories where active limit 1;
insert into auth.users(id,email,raw_user_meta_data) select a,a::text||'@example.invalid',jsonb_build_object('username','test-'||a::text) from test_context;
grant select on test_context to authenticated;
update public.system_settings set setting_value='1' where setting_key in ('daily_post_limit','daily_ranking_limit');
select set_config('request.jwt.claim.sub',(select a::text from test_context),true);
set local role authenticated;
do $$ declare p public.planning_items; f public.planning_items; c public.checkins; rows jsonb[]; request uuid:=gen_random_uuid(); today date:=(now() at time zone 'America/Sao_Paulo')::date; begin
  f:=public.save_plan(null,(select cat from test_context),'Futuro','',today+1,null,null,false);
  begin perform public.record_checkin(f.category_id,'',null,null,null,null,f.id,gen_random_uuid());raise exception 'TEST: future allowed';
  exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if;end;
  p:=public.save_plan(null,f.category_id,'Cancelado','',today,null,null,false);
  p:=public.save_plan(p.id,p.category_id,p.title,'',today,null,null,true);
  begin perform public.record_checkin(p.category_id,'',null,null,null,null,p.id,gen_random_uuid());raise exception 'TEST: cancelled allowed';
  exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if;end;
  p:=public.save_plan(p.id,p.category_id,'Reativado','',today,null,null,false);
  c:=public.record_checkin(p.category_id,'Avulso',null,null,null,null,null,request);
  if public.record_checkin(p.category_id,'Avulso',null,null,null,null,null,request) is distinct from c then raise exception 'TEST: free check-in retry';end if;
  begin perform public.record_checkin(p.category_id,'Segundo avulso',null,null,null,null,null,gen_random_uuid());raise exception 'TEST: free allowance bypassed';
  exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if;end;
  c:=public.record_checkin(p.category_id,'Concluído',null,null,null,null,p.id,gen_random_uuid());
  if c.counts_for_ranking then raise exception 'TEST: ranking allowance bypassed';end if;
  -- Produce >20 records with identical timestamps to exercise tie-breaking.
  for i in 1..23 loop
    p:=public.save_plan(null,f.category_id,'Página '||i,'',today,null,null,false);
    perform public.record_checkin(p.category_id,'Página '||i,null,null,null,null,p.id,gen_random_uuid());
  end loop;
  select array_agg(x) into rows from public.get_feed(null,null,public.current_profile_id(),null) x;
  if array_length(rows,1)<>21 then raise exception 'TEST: feed is not bounded';end if;
  select array_agg(x) into rows from public.get_feed((rows[20]->>'created_at')::timestamptz,(rows[20]->>'id')::uuid,public.current_profile_id(),null) x;
  if array_length(rows,1)<>5 then raise exception 'TEST: cursor lost rows';end if;
end $$;
reset role;
select 'PASS: future/cancelled blocks, reactivate, free allowance, planned completion beyond allowance, ranking limit, retry, cursor ties' result;
rollback;
