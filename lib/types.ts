export type Role = 'USER' | 'ADMIN';

export interface Profile {
  id: string;
  auth_user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  sort_order: number;
  daily_limit: number | null;
  ranking_enabled: boolean;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  category_id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  checkin_date: string;
  counts_for_ranking: boolean;
  created_at: string;
  start_time: string | null;
  end_time: string | null;
  profiles?: Profile;
  categories?: Category;
  checkin_likes?: { user_id: string }[];
  checkin_comments?: { id: string }[];
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface RankingRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  checkin_count: number;
}
