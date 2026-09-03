import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CheckinCard from '@/components/CheckinCard';
import type { Checkin, Profile } from '@/lib/types';

const COUPLE_USERNAMES: Record<string, string> = {
  'luca.romariz': 'roberta.araujo',
  'roberta.araujo': 'luca.romariz',
};

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single<Profile>();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single<Profile>();

  if (!profile) notFound();

  const [{ data: streak }, { data: categoryStats }, { data: checkins }, { count: validCount }] =
    await Promise.all([
      supabase.rpc('get_streak', { p_user_id: profile.id }),
      supabase.rpc('get_category_stats', { p_user_id: profile.id }),
      supabase
        .from('checkins')
        .select('*, profiles(*), categories(*), checkin_likes(user_id), checkin_comments(id)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .returns<Checkin[]>(),
      supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('counts_for_ranking', true),
    ]);

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">Perfil</h1>
      </header>

      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-xl uppercase">
          {profile.display_name.slice(0, 2)}
        </div>
        <h2 className="text-lg font-semibold">{profile.display_name}</h2>
        <p className="text-sm text-muted">@{profile.username}</p>
        {profile.role === 'ADMIN' && (
          <span className="mt-1 rounded-full bg-surface2 px-2 py-0.5 text-[10px] uppercase text-muted">
            Admin
          </span>
        )}
        {COUPLE_USERNAMES[profile.username] && (
          <Link
            href={`/profile/${COUPLE_USERNAMES[profile.username]}`}
            className="mt-1 flex items-center gap-1 text-xs text-pink-300/80 hover:text-pink-300"
          >
            <Heart size={12} className="fill-pink-400 text-pink-400" />
            {COUPLE_USERNAMES[profile.username] === 'roberta.araujo' ? 'Roberta' : 'Luca'}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span>🔥 {(streak as number) ?? 0} dias</span>
          <span>{validCount ?? 0} check-ins válidos</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-y border-border/60 px-4 py-4 sm:grid-cols-3">
        {(categoryStats as any[])?.map((cs) => (
          <div key={cs.category_id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
            <span>
              {cs.icon} {cs.category_name}
            </span>
            <span className="text-muted">{cs.checkin_count}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-muted">
        {profile.id === currentProfile?.id ? 'Meus check-ins' : 'Check-ins'}
      </div>
      {(checkins ?? []).map((c) => (
        <CheckinCard
          key={c.id}
          checkin={c}
          currentProfileId={currentProfile!.id}
          isAdmin={currentProfile!.role === 'ADMIN'}
        />
      ))}
      {(checkins ?? []).length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted">Nenhum check-in ainda.</p>
      )}
    </div>
  );
}
