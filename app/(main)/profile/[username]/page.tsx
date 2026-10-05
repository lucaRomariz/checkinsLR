import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import FeedList from "@/components/FeedList";
import { getSession } from "@/lib/session";
import type { Profile } from "@/lib/types";

const COUPLE_USERNAMES: Record<string, string> = {
  "luca.romariz": "roberta.araujo",
  "roberta.araujo": "luca.romariz",
};

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { before?: string; beforeId?: string };
}) {
  const { supabase, profile: currentProfile } = await getSession();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single<Profile>();

  if (profileError && profileError.code !== "PGRST116")
    throw new Error("Não foi possível carregar o perfil.");
  if (!profile) notFound();

  const results = await Promise.all([
    supabase.rpc("get_streak", { p_user_id: profile.id }),
    supabase.rpc("get_category_stats", { p_user_id: profile.id }),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("counts_for_ranking", true),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Não foi possível carregar as estatísticas.");
  const [{ data: streak }, { data: categoryStats }, { count: validCount }] =
    results;

  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Sua jornada em pequenos passos</p>
        <h1>Perfil</h1>
      </header>

      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-xl uppercase">
          {profile.display_name.slice(0, 2)}
        </div>
        <h2 className="text-lg font-semibold">{profile.display_name}</h2>
        <p className="text-sm text-muted">@{profile.username}</p>
        {profile.role === "ADMIN" && (
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
            {COUPLE_USERNAMES[profile.username] === "roberta.araujo"
              ? "Roberta"
              : "Luca"}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span>🔥 {(streak as number) ?? 0} dias</span>
          <span>{validCount ?? 0} check-ins válidos</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-y border-border/60 px-4 py-4 sm:grid-cols-3">
        {(categoryStats as any[])?.map((cs) => (
          <div
            key={cs.category_id}
            className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm"
          >
            <span>
              {cs.icon} {cs.category_name}
            </span>
            <span className="text-muted">{cs.checkin_count}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-muted">
        {profile.id === currentProfile?.id ? "Meus check-ins" : "Check-ins"}
      </div>
      <FeedList
        {...searchParams}
        userId={profile.id}
        path={`/profile/${profile.username}`}
      />
    </div>
  );
}
