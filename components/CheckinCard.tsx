"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Trash2,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CategoryBadge from "./CategoryBadge";
import Comments from "./Comments";
import type { Checkin } from "@/lib/types";
import { APP_TIME_ZONE } from "@/lib/dates";

export default function CheckinCard({
  checkin,
  currentProfileId,
  isAdmin = false,
  likesEnabled = true,
  commentsEnabled = true,
}: {
  checkin: Checkin;
  currentProfileId: string;
  isAdmin?: boolean;
  likesEnabled?: boolean;
  commentsEnabled?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const lock = useRef(false);
  const [liked, setLiked] = useState(checkin.liked ?? false);
  const [likeCount, setLikeCount] = useState(checkin.like_count ?? 0);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState("");
  const [commentCount, setCommentCount] = useState(checkin.comment_count ?? 0);
  async function toggleLike() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const before = liked;
    setLiked(!before);
    setLikeCount((c) => c + (before ? -1 : 1));
    try {
      const { error: err } = before
        ? await supabase
            .from("checkin_likes")
            .delete()
            .eq("checkin_id", checkin.id)
            .eq("user_id", currentProfileId)
        : await supabase
            .from("checkin_likes")
            .insert({ checkin_id: checkin.id, user_id: currentProfileId });
      if (err) throw err;
    } catch {
      setLiked(before);
      setLikeCount((c) => c + (before ? 1 : -1));
      setError("Não foi possível atualizar a curtida. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (
      lock.current ||
      !confirm(
        checkin.planning_item_id
          ? "Excluir este check-in e reabrir a atividade na agenda?"
          : "Excluir este check-in?",
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.rpc("delete_checkin", {
        p_id: checkin.id,
      });
      if (err) throw err;
      setDeleted(true);
      router.refresh();
    } catch {
      setError("Não foi possível excluir o check-in. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (deleted) return null;
  return (
    <article className="mx-4 my-4 rounded-2xl border border-border bg-surface p-4 sm:mx-5 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={`/profile/${checkin.profiles?.username}`}
          className="flex min-w-0 items-center gap-2 text-sm font-medium"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs uppercase">
            {checkin.profiles?.display_name.slice(0, 2)}
          </span>
          <span className="break-words">{checkin.profiles?.display_name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <time className="text-xs text-muted" dateTime={checkin.created_at}>
            {new Date(checkin.created_at).toLocaleTimeString("pt-BR", {
              timeZone: APP_TIME_ZONE,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          {(checkin.user_id === currentProfileId || isAdmin) && (
            <button
              aria-label="Excluir check-in"
              disabled={busy}
              onClick={remove}
              className="icon-button text-muted"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {checkin.planning_item_id && (
        <p className="mb-3 flex items-center gap-1 text-xs text-emerald-300">
          <CalendarCheck size={14} /> Do planejamento
        </p>
      )}
      {checkin.image_url && (
        <img
          src={checkin.image_url}
          loading="lazy"
          decoding="async"
          alt={checkin.title ?? "Foto do check-in"}
          width={640}
          height={480}
          className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover"
        />
      )}
      {checkin.title && <h2 className="mb-2 break-words font-medium">{checkin.title}</h2>}
      {checkin.description && (
        <p className="mb-3 whitespace-pre-wrap break-words text-sm text-muted">
          {checkin.description}
        </p>
      )}
      {checkin.start_time && (
        <p className="mb-3 flex items-center gap-1 text-xs text-muted">
          <Clock size={13} />
          {checkin.start_time.slice(0, 5)}
          {checkin.end_time ? " – " + checkin.end_time.slice(0, 5) : ""}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <CategoryBadge category={checkin.categories} />
        <div className="flex gap-4 text-muted">
          {likesEnabled && (
            <button
              aria-label={liked ? "Descurtir" : "Curtir"}
              aria-pressed={liked}
              disabled={busy}
              onClick={toggleLike}
              className="flex items-center gap-1 text-xs"
            >
              <Heart
                size={18}
                className={liked ? "fill-rose-400 text-rose-400" : ""}
              />
              {likeCount || ""}
            </button>
          )}
          {commentsEnabled && (
            <button
              aria-label="Mostrar comentários"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((v) => !v)}
              className="flex items-center gap-1 text-xs"
            >
              <MessageCircle size={18} />
              {commentCount || ""}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {commentsOpen && (
        <Comments
          checkinId={checkin.id}
          currentProfileId={currentProfileId}
          isAdmin={isAdmin}
          onCountChange={(delta) =>
            setCommentCount((c) => Math.max(0, c + delta))
          }
        />
      )}
    </article>
  );
}
