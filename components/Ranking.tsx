"use client";

import { useEffect, useState } from "react";
import { todayKey, weekStart } from "@/lib/dates";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Category, RankingRow } from "@/lib/types";

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  all: "Geral",
};

function getRange(period: Period): {
  start: string | null;
  end: string | null;
} {
  const end = todayKey();
  if (period === "today") return { start: end, end };
  if (period === "all") return { start: null, end: null };
  return {
    start: period === "week" ? weekStart(end) : end.slice(0, 8) + "01",
    end,
  };
}

export default function RankingPage({
  initialPeriod = "week",
  enabled = true,
  byCategory = true,
}: {
  initialPeriod?: Period;
  enabled?: boolean;
  byCategory?: boolean;
}) {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, [supabase]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const { start, end } = getRange(period);
    supabase
      .rpc("get_ranking", {
        p_start_date: start,
        p_end_date: end,
        p_category_id: categoryId === "all" ? null : categoryId,
      })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err)
          setError(
            "Não foi possível carregar o ranking. Tente outro filtro ou recarregue.",
          );
        setRows((data as RankingRow[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, period, categoryId, enabled]);

  if (!enabled)
    return (
      <div className="p-6 text-sm text-muted">
        O ranking está desativado nas configurações.
      </div>
    );

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Cada passo conta</p>
        <h1>Classificação</h1>
        <p className="mt-2 text-sm text-muted">Acompanhe a constância e celebre as conquistas de todos.</p>
      </header>

      <div className="space-y-3 border-b border-border/60 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                period === p ? "bg-white text-black" : "bg-surface2 text-muted"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCategoryId("all")}
            aria-pressed={categoryId === "all"}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
              categoryId === "all"
                ? "bg-white text-black"
                : "bg-surface2 text-muted"
            }`}
          >
            Todas
          </button>
          {byCategory &&
            categories.map((c) => (
              <button
                key={c.id}
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  categoryId === c.id
                    ? "bg-white text-black"
                    : "bg-surface2 text-muted"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="p-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="px-4 py-8 text-center text-sm text-muted">
          Carregando...
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Ninguém no ranking ainda neste filtro.
        </p>
      )}

      <ul aria-label="Classificação do período" aria-busy={loading}>
        {!loading && !error && rows.map((row, i) => (
          <li
            key={row.user_id}
            className="flex items-center justify-between border-b border-border/60 px-4 py-3"
          >
            <Link
              href={`/profile/${row.username}`}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="w-6 text-center text-sm">
                {medals[i] ?? i + 1}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs uppercase">
                {row.display_name.slice(0, 2)}
              </span>
              <span className="break-words text-sm font-medium">{row.display_name}</span>
            </Link>
            <span className="ml-3 shrink-0 text-sm text-muted">
              {row.checkin_count} check-ins
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
