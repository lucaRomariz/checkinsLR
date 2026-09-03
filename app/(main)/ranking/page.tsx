'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Category, RankingRow } from '@/lib/types';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week: 'Esta semana',
  month: 'Este mês',
  all: 'Geral',
};

function getRange(period: Period): { start: string | null; end: string | null } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  if (period === 'today') return { start: end, end };
  if (period === 'all') return { start: null, end: null };

  const start = new Date(now);
  if (period === 'week') {
    const day = start.getDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1; // Monday as start of week
    start.setDate(start.getDate() - diff);
  } else {
    start.setDate(1);
  }
  return { start: start.toISOString().slice(0, 10), end };
}

export default function RankingPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>('week');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, [supabase]);

  useEffect(() => {
    setLoading(true);
    const { start, end } = getRange(period);
    supabase
      .rpc('get_ranking', {
        p_start_date: start,
        p_end_date: end,
        p_category_id: categoryId === 'all' ? null : categoryId,
      })
      .then(({ data }) => {
        setRows((data as RankingRow[]) ?? []);
        setLoading(false);
      });
  }, [supabase, period, categoryId]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">🏆 Classificação</h1>
      </header>

      <div className="space-y-3 border-b border-border/60 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                period === p ? 'bg-white text-black' : 'bg-surface2 text-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCategoryId('all')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
              categoryId === 'all' ? 'bg-white text-black' : 'bg-surface2 text-muted'
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                categoryId === c.id ? 'bg-white text-black' : 'bg-surface2 text-muted'
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="px-4 py-8 text-center text-sm text-muted">Carregando...</p>}

      {!loading && rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted">Ninguém no ranking ainda neste filtro.</p>
      )}

      <ul>
        {rows.map((row, i) => (
          <li key={row.user_id} className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <Link href={`/profile/${row.username}`} className="flex items-center gap-3">
              <span className="w-6 text-center text-sm">{medals[i] ?? i + 1}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs uppercase">
                {row.display_name.slice(0, 2)}
              </span>
              <span className="text-sm font-medium">{row.display_name}</span>
            </Link>
            <span className="text-sm text-muted">{row.checkin_count} check-ins</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
