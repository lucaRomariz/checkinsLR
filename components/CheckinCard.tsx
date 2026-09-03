'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Trash2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryBadge from './CategoryBadge';
import Comments from './Comments';
import type { Checkin } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatHHMM(t: string) {
  return t.slice(0, 5);
}

function durationLabel(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export default function CheckinCard({
  checkin,
  currentProfileId,
  isAdmin = false,
}: {
  checkin: Checkin;
  currentProfileId: string;
  isAdmin?: boolean;
}) {
  const supabase = createClient();
  const initiallyLiked = !!checkin.checkin_likes?.some((l) => l.user_id === currentProfileId);
  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(checkin.checkin_likes?.length ?? 0);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentCount = checkin.checkin_comments?.length ?? 0;
  const canDelete = checkin.user_id === currentProfileId || isAdmin;

  async function toggleLike() {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from('checkin_likes')
        .delete()
        .eq('checkin_id', checkin.id)
        .eq('user_id', currentProfileId);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from('checkin_likes').insert({ checkin_id: checkin.id, user_id: currentProfileId });
    }
  }

  async function handleDelete() {
    if (!confirm('Apagar este check-in? Essa ação não pode ser desfeita.')) return;
    setDeleting(true);
    const { error } = await supabase.from('checkins').delete().eq('id', checkin.id);
    if (error) {
      setDeleting(false);
      alert('Não foi possível apagar: ' + error.message);
      return;
    }
    setDeleted(true);
  }

  if (deleted) return null;

  return (
    <article className="border-b border-border/60 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/profile/${checkin.profiles?.username}`}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs uppercase">
            {checkin.profiles?.display_name?.slice(0, 2)}
          </span>
          {checkin.profiles?.display_name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{formatTime(checkin.created_at)}</span>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Apagar check-in"
              className="text-muted transition hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {checkin.image_url && (
        <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl2 bg-surface">
          <Image src={checkin.image_url} alt={checkin.title ?? 'check-in'} fill className="object-cover" />
        </div>
      )}

      {checkin.title && <p className="mb-1 text-sm font-medium">{checkin.title}</p>}
      {checkin.description && <p className="mb-3 text-sm text-muted">{checkin.description}</p>}

      {checkin.start_time && checkin.end_time && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
          <Clock size={13} />
          {formatHHMM(checkin.start_time)} – {formatHHMM(checkin.end_time)} ·{' '}
          {durationLabel(checkin.start_time, checkin.end_time)}
        </p>
      )}

      <div className="flex items-center justify-between">
        <CategoryBadge category={checkin.categories} />
        <div className="flex items-center gap-4 text-muted">
          <button onClick={toggleLike} className="flex items-center gap-1.5 text-xs">
            <Heart size={16} className={liked ? 'fill-red-500 text-red-500' : ''} />
            {likeCount > 0 && likeCount}
          </button>
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-xs ${commentsOpen ? 'text-accent' : ''}`}
          >
            <MessageCircle size={16} />
            {commentCount > 0 && commentCount}
          </button>
        </div>
      </div>

      {commentsOpen && (
        <Comments checkinId={checkin.id} currentProfileId={currentProfileId} isAdmin={isAdmin} />
      )}
    </article>
  );
}
