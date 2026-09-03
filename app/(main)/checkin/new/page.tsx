'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';
import type { DailyVerse } from '@/lib/bible';
import VerseCard from '@/components/VerseCard';

export default function NewCheckinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        setCategories((data as Category[]) ?? []);
        if (data && data.length > 0) setCategoryId(data[0].id);
      });
  }, [supabase]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isDevocional = selectedCategory?.slug === 'devocional';

  function useVerse(verse: DailyVerse) {
    setTitle(verse.reference);
    setDescription(verse.text);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (startTime && endTime && endTime < startTime) {
      setError('O horário de término não pode ser antes do início.');
      setLoading(false);
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (file) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const ext = file.name.split('.').pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('checkin-images')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from('checkin-images').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error: rpcError } = await supabase.rpc('create_checkin', {
        p_category_id: categoryId,
        p_title: title || null,
        p_description: description || null,
        p_image_url: imageUrl,
        p_start_time: startTime || null,
        p_end_time: endTime || null,
      });

      if (rpcError) throw rpcError;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Erro ao publicar check-in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Novo check-in</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5">
        <label className="block cursor-pointer">
          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl2 border border-dashed border-border bg-surface">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <ImagePlus size={28} />
                <span className="text-sm">Adicionar foto (opcional)</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  categoryId === c.id ? 'bg-white text-black' : 'bg-surface2 text-muted'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        {isDevocional && (
          <div className="-mx-4">
            <VerseCard onUse={useVerse} compact />
          </div>
        )}

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Início</span>
            <input
              type="time"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Fim</span>
            <input
              type="time"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <input
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          placeholder="Descrição (opcional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !categoryId}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
    </div>
  );
}
