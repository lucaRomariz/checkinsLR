"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addDays, isOverdue, todayKey, weekStart } from "@/lib/dates";
import type { Category, PlanningItem } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

export default function Agenda({
  items,
  categories,
  day,
  view,
  home = false,
}: {
  items: PlanningItem[];
  categories: Category[];
  day: string;
  view: "day" | "week";
  home?: boolean;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<PlanningItem | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(day);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !lock.current) setEditing(null);
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ) ?? [],
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [editing]);
  const today = todayKey();
  const active = items.filter((p) => !p.cancelled);
  const completed = active.filter((p) => !!p.checkins).length;
  const cancelled = items.length - active.length;
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i))
      : [day];

  function open(item: PlanningItem | "new") {
    setEditing(item);
    setError(null);
    setTitle(item === "new" ? "" : item.title);
    setNotes(item === "new" ? "" : (item.notes ?? ""));
    setDate(item === "new" ? day : item.planned_date);
    setStart(item === "new" ? "" : (item.start_time?.slice(0, 5) ?? ""));
    setEnd(item === "new" ? "" : (item.end_time?.slice(0, 5) ?? ""));
    setCategoryId(
      item === "new" ? (categories[0]?.id ?? "") : item.category_id,
    );
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = new FormData(event.currentTarget);
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().rpc("save_plan", {
        p_id: editing && editing !== "new" ? editing.id : null,
        p_category_id: categoryId,
        p_title: title.trim(),
        p_notes: notes.trim() || null,
        p_date: date,
        p_start: String(submitted.get("start") ?? start) || null,
        p_end: String(submitted.get("end") ?? end) || null,
        p_cancelled: editing && editing !== "new" ? editing.cancelled : false,
      });
      if (err) throw err;
      setEditing(null);
      setMessage("Planejamento salvo.");
      if (date !== day) router.push(`/agenda?date=${date}&view=day`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ((err as { message?: string }).message ??
              "Não foi possível salvar."),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function cancel(item: PlanningItem) {
    if (lock.current) return;
    if (
      !item.cancelled &&
      !confirm(`Cancelar “${item.title}”? Você poderá reativar depois.`)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().rpc("save_plan", {
        p_id: item.id,
        p_category_id: item.category_id,
        p_title: item.title,
        p_notes: item.notes,
        p_date: item.planned_date,
        p_start: item.start_time,
        p_end: item.end_time,
        p_cancelled: !item.cancelled,
      });
      if (err) throw err;
      setMessage(
        item.cancelled ? "Atividade reativada." : "Atividade cancelada.",
      );
      router.refresh();
    } catch (err) {
      setError(
        (err as { message?: string }).message ??
          "Não foi possível alterar a atividade.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5 p-5">
      <section className="rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/50 to-surface p-5">
        <p className="eyebrow">
          {view === "week" ? "Sua semana" : "Seu dia"}, no seu ritmo
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold">
              {completed}
              <span className="text-lg font-normal text-muted">
                {" "}
                / {active.length}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted">atividades concluídas</p>
          </div>
          <CalendarDays className="text-emerald-400" size={32} />
        </div>
        <progress
          className="mt-4 h-2 w-full overflow-hidden rounded-full accent-emerald-400"
          value={completed}
          max={active.length || 1}
          aria-label="Progresso do planejamento"
        />
        <p className="mt-2 text-xs text-muted">
          {active.length
            ? `${Math.round((completed / active.length) * 100)}% do planejamento realizado`
            : "Comece reservando um momento para você."}
          {cancelled > 0 && ` · ${cancelled} cancelada(s)`}
        </p>
      </section>
      {!home && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link
              aria-label="Período anterior"
              className="icon-button"
              href={`/agenda?date=${addDays(day, view === "week" ? -7 : -1)}&view=${view}`}
            >
              <ChevronLeft size={20} />
            </Link>
            <label className="sr-only" htmlFor="agenda-date">
              Data da agenda
            </label>
            <input
              id="agenda-date"
              type="date"
              className="rounded-lg p-2 text-sm"
              value={day}
              onChange={(e) =>
                e.target.value &&
                router.push(`/agenda?date=${e.target.value}&view=${view}`)
              }
            />
            <Link
              aria-label="Próximo período"
              className="icon-button"
              href={`/agenda?date=${addDays(day, view === "week" ? 7 : 1)}&view=${view}`}
            >
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="agenda-period-links flex gap-1 rounded-xl bg-surface p-1">
            {(["day", "week"] as const).map((v) => (
              <Link
                key={v}
                className={`rounded-lg px-3 py-2 text-sm ${v === view ? "bg-surface2 text-white" : "text-muted"}`}
                href={`/agenda?date=${day}&view=${v}`}
              >
                {v === "day" ? "Dia" : "Semana"}
              </Link>
            ))}
            <Link
              className="rounded-lg px-3 py-2 text-sm text-emerald-300"
              href="/agenda"
            >
              Hoje
            </Link>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {home ? "Planejado para hoje" : "Meu planejamento"}
        </h2>
        <button
          className="flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
          disabled={!categories.length}
          onClick={() => open("new")}
        >
          <Plus size={16} /> Planejar
        </button>
      </div>
      {!categories.length && (
        <p className="text-sm text-muted">
          Ative uma categoria nas configurações para começar a planejar.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && !editing && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {days.map((d) => (
        <section key={d} className="space-y-3">
          {view === "week" && (
            <h3 className="pt-2 text-sm font-semibold">
              {new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                timeZone: "America/Sao_Paulo",
              })}
            </h3>
          )}
          {!items.some((p) => p.planned_date === d) && (
            <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
              <CalendarDays className="mx-auto mb-3 text-muted" size={24} />
              <p className="text-sm text-muted">
                {view === "week"
                  ? "Dia livre para planejar."
                  : "Seu planejamento começa aqui."}
              </p>
              {view === "day" && (
                <p className="mt-1 text-xs text-muted">
                  Adicione um treino, estudo, devocional ou outro compromisso.
                </p>
              )}
            </div>
          )}
          {items
            .filter((p) => p.planned_date === d)
            .map((item) => {
              const done = !!item.checkins;
              const late =
                !done &&
                !item.cancelled &&
                isOverdue(item.planned_date, item.end_time);
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 ${done ? "border-emerald-900/60 bg-emerald-950/15" : "border-border bg-surface"} ${item.cancelled ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-muted">
                        {item.start_time
                          ? `${item.start_time.slice(0, 5)}${item.end_time ? " – " + item.end_time.slice(0, 5) : ""}`
                          : "Sem horário definido"}
                      </p>
                      <h3
                        className={`break-words font-medium ${item.cancelled ? "line-through" : ""}`}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] ${done ? "bg-emerald-400/10 text-emerald-300" : late ? "bg-amber-400/10 text-amber-300" : "bg-surface2 text-muted"}`}
                    >
                      {done
                        ? "Concluída"
                        : item.cancelled
                          ? "Cancelada"
                          : late
                            ? "Atrasada"
                            : "Pendente"}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">
                      {item.notes}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <CategoryBadge category={item.categories} />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {done ? (
                        <Link
                          className="touch-target flex items-center gap-1 text-emerald-300"
                          href={`/checkin/${item.checkins!.id}`}
                        >
                          <Check size={15} /> Ver check-in
                        </Link>
                      ) : (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => open(item)}
                            className="touch-target rounded-lg px-2 text-muted hover:bg-surface2 hover:text-white"
                          >
                            Editar
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => cancel(item)}
                            className="touch-target rounded-lg px-2 text-muted hover:bg-surface2 hover:text-white"
                          >
                            {item.cancelled ? "Reativar" : "Cancelar"}
                          </button>
                          {!item.cancelled && item.planned_date <= today && (
                            <Link
                              className="touch-target inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 font-medium text-black"
                              href={`/checkin/new?plan=${item.id}`}
                            >
                              Fazer check-in
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </section>
      ))}
      {home && (
        <Link
          href="/agenda?view=week"
          className="block rounded-xl border border-border p-3 text-center text-sm"
        >
          Ver minha semana →
        </Link>
      )}
      <p className="text-xs text-muted">
        Horários de Brasília · Sua agenda é privada. Os check-ins aparecem para
        as pessoas do app.
      </p>
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-center"
          role="presentation"
        >
          <section
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-bg p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="plan-title" className="text-lg font-semibold">
                {editing === "new"
                  ? "Planejar atividade"
                  : "Editar planejamento"}
              </h2>
              <button
                aria-label="Fechar formulário"
                disabled={busy}
                onClick={() => setEditing(null)}
                className="icon-button"
              >
                <X size={20} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={save}>
              <label className="field">
                Atividade
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Treino de força"
                />
              </label>
              <label className="field">
                Categoria
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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
              <label className="field">
                Data
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  Início previsto
                  <input
                    type="time"
                    name="start"
                    value={start}
                    onInput={(e) => setStart(e.currentTarget.value)}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="field">
                  Fim previsto
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
              <label className="field">
                Observações
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="O que você quer realizar?"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-300">
                  {error}
                </p>
              )}
              <button
                disabled={busy || !categoryId || !title.trim()}
                className="w-full rounded-xl bg-emerald-400 p-3 font-medium text-black disabled:opacity-50"
              >
                {busy ? "Salvando..." : "Salvar planejamento"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
