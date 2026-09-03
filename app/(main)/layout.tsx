import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NavShell from '@/components/NavShell';
import type { Profile } from '@/lib/types';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single<Profile>();

  if (!profile) {
    redirect('/login');
  }

  return <NavShell profile={profile}>{children}</NavShell>;
}
