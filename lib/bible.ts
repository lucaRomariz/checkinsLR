"use client";
import { todayKey } from "./dates";

export interface DailyVerse {
  reference: string;
  text: string;
  translation: string;
}

const CACHE_KEY_PREFIX = "verse-of-day:";

/**
 * bible-api.com's random endpoint shape has varied a bit over time, so we parse
 * defensively instead of assuming one exact structure.
 */
function parseRandomResponse(data: any): DailyVerse | null {
  const v = data?.random_verse ?? data?.verse ?? data;
  if (!v) return null;

  const text: string | undefined = v.text ?? data?.text;
  if (!text) return null;

  const book: string | undefined = v.book ?? v.book_name;
  const chapter = v.chapter;
  const verse = v.verse;
  const reference =
    data?.reference ??
    (book && chapter && verse ? `${book} ${chapter}:${verse}` : undefined);

  const translation: string =
    data?.translation?.name ??
    data?.translation_name ??
    data?.translation?.identifier ??
    "";

  return {
    reference: reference ?? "",
    text: text.trim(),
    translation,
  };
}

/**
 * Fetches (and caches for the current day, per browser) a verse of the day.
 * Defaults to the Almeida (Portuguese) translation since the app is in pt-BR.
 * Falls back to WEB (English) if the Portuguese endpoint fails.
 */
export async function getVerseOfTheDay(
  translation: string = "almeida",
): Promise<DailyVerse | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${translation}:${todayKey()}`;

  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as DailyVerse;
  } catch {
    // localStorage unavailable — just skip caching
  }

  const tryFetch = async (t: string) => {
    const res = await fetch(`https://bible-api.com/data/${t}/random`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`bible-api ${res.status}`);
    const data = await res.json();
    return parseRandomResponse(data);
  };

  let verse: DailyVerse | null = null;
  try {
    verse = await tryFetch(translation);
  } catch {
    try {
      verse = await tryFetch("web");
    } catch {
      verse = null;
    }
  }

  if (verse) {
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(verse));
    } catch {
      // ignore
    }
  }

  return verse;
}

/** Fetches a fresh random verse, bypassing the daily cache (for "outro versículo"). */
export async function getRandomVerse(
  translation: string = "almeida",
): Promise<DailyVerse | null> {
  try {
    const res = await fetch(
      `https://bible-api.com/data/${translation}/random`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error(`bible-api ${res.status}`);
    const data = await res.json();
    return parseRandomResponse(data);
  } catch {
    return null;
  }
}
