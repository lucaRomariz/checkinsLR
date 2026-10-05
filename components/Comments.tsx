"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string; username: string } | null;
}
export default function Comments({
  checkinId,
  currentProfileId,
  isAdmin,
  onCountChange,
}: {
  checkinId: string;
  currentProfileId: string;
  isAdmin: boolean;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const lock = useRef(false);
  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError("");
      try {
        const { data, error: err } = await createClient()
          .from("checkin_comments")
          .select(
            "id,content,created_at,user_id,profiles(display_name,username)",
          )
          .eq("checkin_id", checkinId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 20);
        if (err) throw err;
        const rows = data as unknown as CommentRow[];
        setHasMore(rows.length > 20);
        setComments((c) =>
          offset ? [...c, ...rows.slice(0, 20)] : rows.slice(0, 20),
        );
      } catch {
        setError("Não foi possível carregar os comentários.");
      } finally {
        setLoading(false);
      }
    },
    [checkinId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || loading || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { error: err } = await createClient()
        .from("checkin_comments")
        .insert({
          checkin_id: checkinId,
          user_id: currentProfileId,
          content: text.trim(),
        });
      if (err) throw err;
      setText("");
      onCountChange(1);
      await load();
    } catch {
      setError("Não foi possível enviar o comentário.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error: err } = await createClient()
        .from("checkin_comments")
        .delete()
        .eq("id", id)
        .select("id");
      if (err || !data?.length) throw err;
      onCountChange(-1);
      await load();
    } catch {
      setError("Não foi possível excluir o comentário.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-words text-sm">
            <span className="font-medium">{c.profiles?.display_name}</span>{" "}
            <span className="text-muted">{c.content}</span>
          </p>
          {(c.user_id === currentProfileId || isAdmin) && (
            <button
              disabled={busy || loading}
              aria-label="Excluir comentário"
              onClick={() => remove(c.id)}
              className="shrink-0 p-1 text-muted"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!loading && !error && !comments.length && <p className="text-sm text-muted">Seja a primeira pessoa a celebrar esta conquista.</p>}
      {loading && (
        <p role="status" className="text-xs text-muted">Carregando comentários...</p>
      )}
      {hasMore && (
        <button
          disabled={loading || busy}
          className="text-xs underline"
          onClick={() => load(comments.length)}
        >
          Ver mais comentários
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}{" "}
          <button disabled={busy || loading} className="underline" onClick={() => load()}>
            Recarregar
          </button>
        </p>
      )}
      <form onSubmit={send} className="flex gap-2">
        <label className="sr-only" htmlFor={`comment-${checkinId}`}>
          Comentário
        </label>
        <input
          id={`comment-${checkinId}`}
          disabled={busy}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          className="min-w-0 flex-1 rounded-xl p-3 text-sm"
        />
        <button
          disabled={busy || loading || !text.trim()}
          className="rounded-xl bg-white px-3 text-xs text-black disabled:opacity-50"
        >
          {busy ? "Aguarde…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
