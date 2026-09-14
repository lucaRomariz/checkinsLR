
-- Ranking: count of valid check-ins per user within a date range, optional category filter
create or replace function public.get_ranking(
  p_start_date date default null,
  p_end_date date default null,
  p_category_id uuid default null
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  checkin_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(c.id) as checkin_count
  from public.checkins c
  join public.profiles p on p.id = c.user_id
  where c.counts_for_ranking = true
    and (p_start_date is null or c.checkin_date >= p_start_date)
    and (p_end_date is null or c.checkin_date <= p_end_date)
    and (p_category_id is null or c.category_id = p_category_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by checkin_count desc, p.display_name asc;
$$;

grant execute on function public.get_ranking(date, date, uuid) to authenticated, anon;

-- Streak: consecutive days (ending today or yesterday) with at least one ranking-valid check-in
create or replace function public.get_streak(p_user_id uuid)
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
$$;

grant execute on function public.get_streak(uuid) to authenticated, anon;

-- Per-category check-in counts for a user's profile page
create or replace function public.get_category_stats(p_user_id uuid)
returns table (
  category_id uuid,
  category_name text,
  icon text,
  color text,
  checkin_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cat.id, cat.name, cat.icon, cat.color, count(c.id) as checkin_count
  from public.categories cat
  left join public.checkins c on c.category_id = cat.id and c.user_id = p_user_id
  group by cat.id, cat.name, cat.icon, cat.color, cat.sort_order
  order by cat.sort_order;
$$;

grant execute on function public.get_category_stats(uuid) to authenticated, anon;

