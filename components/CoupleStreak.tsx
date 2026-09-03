'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

const COUPLE_USERNAMES = ['luca.romariz', 'roberta.araujo'];

export default function CoupleStreak() {
  const supabase = createClient();
  const [pair, setPair] = useState<Profile[] | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .in('username', COUPLE_USERNAMES)
      .then(async ({ data }) => {
        const profiles = (data as Profile[]) ?? [];
        if (profiles.length !== 2) return; // only show once both accounts exist
        setPair(profiles);

        const { data: s } = await supabase.rpc('get_couple_streak', {
          p_user_a: profiles[0].id,
          p_user_b: profiles[1].id,
        });
        setStreak((s as number) ?? 0);
      });
  }, [supabase]);

  if (!pair || streak === null) return null;

  const [a, b] = pair;

  return (
    <div className="relative mx-4 my-3 overflow-hidden rounded-xl2 border border-pink-900/30 bg-gradient-to-br from-pink-950/20 via-surface to-orange-950/10 px-4 py-4">
      {/* soft floating hearts, purely decorative */}
      <Heart size={54} className="pointer-events-none absolute -right-3 -top-3 rotate-12 text-pink-500/10" />
      <Heart size={28} className="pointer-events-none absolute bottom-1 right-10 -rotate-12 text-pink-500/10" />

      <div className="relative flex items-center gap-3">
        <div className="flex -space-x-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-surface2 text-xs uppercase">
            {a.display_name.slice(0, 2)}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg bg-surface2 text-xs uppercase">
            {b.display_name.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">
            {a.display_name.split(' ')[0]} <Heart size={12} className="mb-0.5 inline fill-pink-400 text-pink-400" />{' '}
            {b.display_name.split(' ')[0]}
          </p>
          <p className="text-xs text-muted">
            {streak > 0 ? (
              <>🔥 {streak} {streak === 1 ? 'dia' : 'dias'} juntos</>
            ) : (
              'Comecem hoje, juntos'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
