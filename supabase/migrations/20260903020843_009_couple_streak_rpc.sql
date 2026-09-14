
create or replace function public.get_couple_streak(p_user_a uuid, p_user_b uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_streak int := 0;
  v_cursor date := (timezone('utc', now()))::date;
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
$$;

grant execute on function public.get_couple_streak(uuid, uuid) to authenticated;
revoke execute on function public.get_couple_streak(uuid, uuid) from anon;

