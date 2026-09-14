
insert into public.categories (name, slug, icon, color, sort_order, daily_limit, ranking_enabled) values
  ('Estudos', 'estudos', '📚', '#60A5FA', 1, 2, true),
  ('Esporte', 'esporte', '🏃', '#34D399', 2, 2, true),
  ('Alimentação', 'alimentacao', '🥗', '#FBBF24', 3, 3, true),
  ('Casa', 'casa', '🏠', '#F472B6', 4, 2, true),
  ('Higiene', 'higiene', '🧼', '#38BDF8', 5, 2, true),
  ('Ministério', 'ministerio', '⛪', '#A78BFA', 6, 1, true),
  ('Devocional', 'devocional', '✝️', '#FB923C', 7, 1, true);

insert into public.system_settings (setting_key, setting_value, description) values
  ('daily_post_limit', '2', 'Máximo de postagens por usuário por dia'),
  ('daily_ranking_limit', '1', 'Máximo de check-ins contabilizados no ranking por dia'),
  ('ranking_enabled', 'true', 'Se o ranking está ativo no sistema'),
  ('ranking_default_period', 'week', 'Período padrão exibido no ranking (today|week|month|all)'),
  ('ranking_by_category', 'true', 'Se filtros de ranking por categoria estão habilitados'),
  ('likes_enabled', 'true', 'Se curtidas estão habilitadas'),
  ('comments_enabled', 'true', 'Se comentários estão habilitados');

