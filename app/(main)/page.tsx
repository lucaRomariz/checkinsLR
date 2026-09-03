import { createClient } from '@/lib/supabase/server';
import CheckinCard from '@/components/CheckinCard';
import VerseCard from '@/components/VerseCard';
import CoupleStreak from '@/components/CoupleStreak';
import WeddingBanner from '@/components/WeddingBanner';
import type { Checkin, Profile } from '@/lib/types';

function dayLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (fmt(date) === fmt(today)) return 'Hoje';
  if (fmt(date) === fmt(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default async function FeedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single<Profile>();

  const { data: checkins } = await supabase
    .from('checkins')
    .select(
      '*, profiles(*), categories(*), checkin_likes(user_id), checkin_comments(id)'
    )
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Checkin[]>();

  const groups: Record<string, Checkin[]> = {};
  for (const c of checkins ?? []) {
    groups[c.checkin_date] = groups[c.checkin_date] ? [...groups[c.checkin_date], c] : [c];
  }
  const orderedDates = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">Feed</h1>
      </header>

      <WeddingBanner />
      <CoupleStreak />
      <VerseCard />

      {orderedDates.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Nenhum check-in ainda. Toque em + para registrar o primeiro.
        </p>
      )}

      {orderedDates.map((date) => (
        <div key={date}>
          <div className="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-muted">
            {dayLabel(date)}
          </div>
          {groups[date].map((checkin) => (
            <CheckinCard
              key={checkin.id}
              checkin={checkin}
              currentProfileId={profile!.id}
              isAdmin={profile!.role === 'ADMIN'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
