"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getVerseOfTheDay, getRandomVerse, type DailyVerse } from "@/lib/bible";

export default function VerseCard({
  onUse,
  compact = false,
}: {
  onUse?: (verse: DailyVerse) => void;
  compact?: boolean;
}) {
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerseOfTheDay().then((v) => {
      setVerse(v);
      setLoading(false);
    });
  }, []);

  async function shuffle() {
    setLoading(true);
    const v = await getRandomVerse();
    setVerse(v);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="mx-4 my-3 animate-pulse rounded-xl2 border border-orange-900/30 bg-gradient-to-br from-orange-950/30 to-surface px-4 py-4">
        <div className="h-3 w-24 rounded bg-surface2" />
        <div className="mt-3 h-3 w-full rounded bg-surface2" />
      </div>
    );
  }

  if (!verse) return null;

  return (
    <div
      className={`mx-4 ${compact ? "my-2" : "my-3"} rounded-xl2 border border-orange-900/30 bg-gradient-to-br from-orange-950/25 to-surface px-4 py-4`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-orange-300/80">
          ✝️ Versículo de hoje
        </span>
        <button
          onClick={shuffle}
          className="text-muted transition hover:text-accent"
          title="Outro versículo"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-sm italic leading-relaxed text-accent/90">
        &ldquo;{verse.text}&rdquo;
      </p>
      <p className="mt-2 text-xs text-muted">
        {verse.reference}
        {verse.translation ? ` · ${verse.translation}` : ""}
      </p>
      {onUse && (
        <button
          onClick={() => onUse(verse)}
          className="mt-3 rounded-full bg-orange-900/30 px-3 py-1.5 text-xs font-medium text-orange-200 transition hover:bg-orange-900/50"
        >
          Usar neste check-in
        </button>
      )}
    </div>
  );
}
