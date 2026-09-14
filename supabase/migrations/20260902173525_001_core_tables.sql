
-- Extensions
create extension if not exists pgcrypto;

-- PROFILES
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  role text not null default 'USER' check (role in ('USER','ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  color text,
  active boolean not null default true,
  sort_order int not null default 0,
  daily_limit int,              -- override for max posts/day in this category (null = no category-specific cap)
  ranking_enabled boolean not null default true, -- whether this category can count toward ranking at all
  created_at timestamptz not null default now()
);

-- CHECKINS
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text,
  description text,
  image_url text,
  checkin_date date not null default (timezone('utc', now()))::date,
  counts_for_ranking boolean not null default false,
  created_at timestamptz not null default now()
);

create index checkins_user_date_idx on public.checkins (user_id, checkin_date);
create index checkins_category_idx on public.checkins (category_id);
create index checkins_ranking_idx on public.checkins (checkin_date, counts_for_ranking) where counts_for_ranking = true;

-- LIKES
create table public.checkin_likes (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (checkin_id, user_id)
);

-- COMMENTS
create table public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- SYSTEM SETTINGS
create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  setting_value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

