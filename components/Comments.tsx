'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
}: {
  checkinId: string;
  currentProfileId: string;
  isAdmin: boolean;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('checkin_comments')
      .select('id, content, created_at, user_id, profiles(display_name, username)')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: true });
    setComments((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinId]);

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error } = await supabase
      .from('checkin_comments')
      .insert({ checkin_id: checkinId, user_id: currentProfileId, content });
    if (!error) {
      setText('');
      await load();
    }
    setSending(false);
  }

  async function handleDelete(id: string) {
    setComments((cs) => cs.filter((c) => c.id !== id));
    await supabase.from('checkin_comments').delete().eq('id', id);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      {loading && <p className="text-xs text-muted">Carregando comentários...</p>}

      {!loading && comments.length === 0 && (
        <p className="text-xs text-muted">Seja o primeiro a comentar.</p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2">
          <p className="text-sm">
            <span className="font-medium">{c.profiles?.display_name ?? 'Alguém'}</span>{' '}
            <span className="text-muted">{c.content}</span>
          </p>
          {(c.user_id === currentProfileId || isAdmin) && (
            <button
              onClick={() => handleDelete(c.id)}
              className="shrink-0 text-muted transition hover:text-red-400"
              title="Apagar comentário"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escreva um comentário..."
          className="flex-1 rounded-full px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
