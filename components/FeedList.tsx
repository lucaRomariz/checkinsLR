import Link from "next/link";
import CheckinCard from "@/components/CheckinCard";
import { getFeed } from "@/lib/feed";
import { getSession, getSettings } from "@/lib/session";
import { dateLabel } from "@/lib/dates";

export default async function FeedList({
  before,
  beforeId,
  userId,
  checkinId,
  path = "/feed",
}: {
  before?: string;
  beforeId?: string;
  userId?: string;
  checkinId?: string;
  path?: string;
}) {
  const [{ rows, hasMore }, { profile }, settings] = await Promise.all([
    getFeed({ before, beforeId, userId, checkinId }),
    getSession(),
    getSettings(),
  ]);
  const last = rows[rows.length - 1];
  return (
    <div>
      {before && (
        <Link href={path} className="block px-5 py-3 text-sm underline">
          Voltar aos mais recentes
        </Link>
      )}
      {!rows.length && (
        <div className="px-5 py-12 text-center">
          <p className="font-medium">Nenhum check-in por aqui</p>
          <p className="mt-2 text-sm text-muted">
            Registre uma atividade da sua agenda ou faça um check-in avulso.
          </p>
          <Link href="/agenda" className="mt-4 inline-block text-sm underline">
            Abrir minha agenda
          </Link>
        </div>
      )}
      {rows.map((row, i) => (
        <div key={row.id}>
          {(i === 0 || rows[i - 1].checkin_date !== row.checkin_date) && (
            <p className="px-5 pt-5 text-xs font-semibold uppercase tracking-wider text-muted">
              {dateLabel(row.checkin_date)}
            </p>
          )}
          <CheckinCard
            checkin={row}
            currentProfileId={profile.id}
            isAdmin={profile.role === "ADMIN"}
            likesEnabled={settings.likes_enabled !== "false"}
            commentsEnabled={settings.comments_enabled !== "false"}
          />
        </div>
      ))}
      {hasMore && last && (
        <Link
          className="m-5 block rounded-xl border border-border p-3 text-center text-sm hover:bg-surface2"
          href={`${path}?${new URLSearchParams({ before: last.created_at, beforeId: last.id })}`}
        >
          Ver registros anteriores
        </Link>
      )}
    </div>
  );
}
