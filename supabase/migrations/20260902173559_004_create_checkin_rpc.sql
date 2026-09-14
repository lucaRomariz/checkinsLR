
create or replace function public.create_checkin(
  p_category_id uuid,
  p_title text default null,
  p_description text default null,
  p_image_url text default null
)
returns public.checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_today date := (timezone('utc', now()))::date;
  v_daily_post_limit int;
  v_daily_ranking_limit int;
  v_category record;
  v_post_count_today int;
  v_category_count_today int;
  v_ranking_count_today int;
  v_counts_for_ranking boolean := false;
  v_row public.checkins;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Perfil não encontrado para o usuário autenticado';
  end if;

  select * into v_category from public.categories where id = p_category_id and active = true;
  if not found then
    raise exception 'Categoria inválida ou inativa';
  end if;

  select coalesce((select setting_value from public.system_settings where setting_key = 'daily_post_limit')::int, 2) into v_daily_post_limit;
  select coalesce((select setting_value from public.system_settings where setting_key = 'daily_ranking_limit')::int, 1) into v_daily_ranking_limit;

  -- Serialize concurrent check-ins from the same user on the same day
  perform pg_advisory_xact_lock(hashtextextended(v_profile_id::text || v_today::text, 0));

  select count(*) into v_post_count_today
  from public.checkins
  where user_id = v_profile_id and checkin_date = v_today;

  if v_post_count_today >= v_daily_post_limit then
    raise exception 'Limite diário atingido. Você já realizou % check-ins hoje.', v_post_count_today;
  end if;

  if v_category.daily_limit is not null then
    select count(*) into v_category_count_today
    from public.checkins
    where user_id = v_profile_id and checkin_date = v_today and category_id = p_category_id;

    if v_category_count_today >= v_category.daily_limit then
      raise exception 'Limite diário para a categoria % atingido.', v_category.name;
    end if;
  end if;

  if v_category.ranking_enabled then
    select count(*) into v_ranking_count_today
    from public.checkins
    where user_id = v_profile_id and checkin_date = v_today and counts_for_ranking = true;

    if v_ranking_count_today < v_daily_ranking_limit then
      v_counts_for_ranking := true;
    end if;
  end if;

  insert into public.checkins (user_id, category_id, title, description, image_url, checkin_date, counts_for_ranking)
  values (v_profile_id, p_category_id, p_title, p_description, p_image_url, v_today, v_counts_for_ranking)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_checkin(uuid, text, text, text) to authenticated;

