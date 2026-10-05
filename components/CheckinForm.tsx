"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { prepareImage } from "@/lib/images";
import { dateLabel } from "@/lib/dates";
import type { Category, PlanningItem } from "@/lib/types";

const VerseCard = dynamic(() => import("./VerseCard"));

export default function CheckinForm({
  categories,
  plan,
  authUserId,
}: {
  categories: Category[];
  plan: PlanningItem | null;
  authUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const lock = useRef(false);
  const requestId = useRef<string | null>(null);
  const uploaded = useRef<{ path: string; url: string } | null>(null);
  const [category, setCategory] = useState(
    plan?.category_id ?? categories[0]?.id ?? "",
  );
  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.notes ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function pick(f?: File) {
    if (!f || preparing || busy || uploaded.current) return;
    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareImage(f);
      setFile(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPreparing(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitted = new FormData(e.currentTarget);
    if (lock.current || preparing) return;
    lock.current = true;
    setBusy(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      if (file && !uploaded.current) {
        const path = `${authUserId}/${requestId.current}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("checkin-images")
          .upload(path, file);
        if (
          uploadError &&
          !["409", "Duplicate"].includes(
            String((uploadError as { statusCode?: string }).statusCode),
          ) &&
          uploadError.message !== "The resource already exists"
        )
          throw uploadError;
        uploaded.current = {
          path,
          url: supabase.storage.from("checkin-images").getPublicUrl(path).data
            .publicUrl,
        };
      }
      const { data, error: rpcError } = await supabase.rpc("record_checkin", {
        p_category_id: category,
        p_title: title || null,
        p_description: description || null,
        p_image_url: uploaded.current?.url ?? null,
        p_start_time: String(submitted.get("start") ?? start) || null,
        p_end_time: String(submitted.get("end") ?? end) || null,
        p_planning_item_id: plan?.id ?? null,
        p_request_id: requestId.current,
      });
      if (rpcError) {
        // These SQL errors confirm rollback. Network errors keep the upload for an idempotent retry.
        if (uploaded.current && /^(P0001|22|23)/.test(rpcError.code ?? "")) {
          const { error: cleanupError } = await supabase.storage
            .from("checkin-images")
            .remove([uploaded.current.path]);
          if (!cleanupError) uploaded.current = null;
        }
        throw rpcError;
      }
      if (uploaded.current && data.image_url !== uploaded.current.url)
        await supabase.storage
          .from("checkin-images")
          .remove([uploaded.current.path]);
      router.push(
        plan ? `/agenda?date=${plan.planned_date}` : `/checkin/${data.id}`,
      );
      router.refresh();
    } catch (err) {
      setError(
        (err as { message?: string }).message ??
          "Não foi possível publicar. Tente novamente.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="p-5" aria-busy={busy}>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
      {plan && (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4">
          <p className="text-sm font-medium text-emerald-300">
            Do seu planejamento
          </p>
          <p className="mt-1 text-xs text-muted">
            {dateLabel(plan.planned_date)}
            {plan.start_time
              ? ` · Previsto: ${plan.start_time.slice(0, 5)}${plan.end_time ? " – " + plan.end_time.slice(0, 5) : ""}`
              : ""}
          </p>
          <p className="mt-2 text-xs text-muted">
            Ao publicar, esta atividade será marcada como concluída na agenda.
          </p>
        </div>
      )}
      <label className="field">
        O que você realizou?
        <input
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Treino concluído"
        />
      </label>
      <label className="field">
        Categoria
        <select
          required
          value={category}
          disabled={!!plan}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="" disabled>
            Escolha uma categoria
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </label>
      {categories.find((c) => c.id === category)?.slug === "devocional" && (
        <VerseCard
          compact
          onUse={(verse) => {
            setTitle(verse.reference);
            setDescription(verse.text);
          }}
        />
      )}
      <div>
        <p className="mb-3 text-sm font-medium">
          Horário realizado{" "}
          <span className="font-normal text-muted">(opcional)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Início
            <input
              type="time"
              name="start"
              value={start}
              onInput={(e) => setStart(e.currentTarget.value)}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field">
            Fim
            <input
              type="time"
              name="end"
              min={start || undefined}
              value={end}
              onInput={(e) => setEnd(e.currentTarget.value)}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      </div>
      <label className="field">
        Como foi?
        <textarea
          rows={3}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Uma conquista, aprendizado ou observação..."
        />
      </label>
      <fieldset disabled={busy || preparing || !!uploaded.current} className="rounded-2xl border border-dashed border-border bg-surface p-4">
        <legend className="px-2 text-sm font-medium">📸 Uma foto da sua conquista?</legend>
        <p className="mb-3 text-xs text-muted">Opcional, mas deixa a história ainda mais sua.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">Escolher da galeria
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <label className="field">Tirar uma foto
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">JPG, PNG ou WebP, até 20 MB. Reduzimos a foto antes de enviar.</p>
        {preparing && <p role="status" className="mt-3 text-sm text-muted">Preparando sua foto…</p>}
        {preview && <div className="mt-4 space-y-2">
          <img src={preview} alt="Foto selecionada para o check-in" className="max-h-72 w-full rounded-xl object-contain" />
          <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm" onClick={() => { setFile(null); setPreview(""); }}>Remover foto</button>
        </div>}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {uploaded.current && error && (
        <p className="text-xs text-muted">
          Sua foto foi enviada. Tente publicar novamente; o registro não será
          duplicado.
        </p>
      )}
      <button
        disabled={busy || preparing || !category}
        className="w-full rounded-xl bg-emerald-400 p-3 font-medium text-black disabled:opacity-50"
      >
        {busy
          ? "Publicando..."
          : plan
            ? "Concluir atividade e publicar"
            : "Publicar check-in"}
      </button>
      </fieldset>
      <Link
        className="mt-5 block text-center text-sm text-muted"
        href={plan ? `/agenda?date=${plan.planned_date}` : "/"}
      >
        Voltar
      </Link>
    </form>
  );
}
