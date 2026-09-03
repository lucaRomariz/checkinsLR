import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/SettingsForm';
import type { Category, Profile, SystemSetting } from '@/lib/types';

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single<Profile>();

  if (!profile || profile.role !== 'ADMIN') {
    redirect('/');
  }

  const [{ data: settings }, { data: categories }, { data: admins }] = await Promise.all([
    supabase.from('system_settings').select('*').order('setting_key'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('profiles').select('*').eq('role', 'ADMIN'),
  ]);

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">⚙️ Configurações</h1>
      </header>
      <SettingsForm
        initialSettings={(settings as SystemSetting[]) ?? []}
        initialCategories={(categories as Category[]) ?? []}
        admins={(admins as Profile[]) ?? []}
      />
    </div>
  );
}
