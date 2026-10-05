"use client";
import ThemePicker from "./ThemePicker";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Heart,
  CalendarDays,
  Home,
  LayoutList,
  Trophy,
  User,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function NavShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const main = [
    { href: "/", label: "Hoje", icon: Home },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/feed", label: "Feed", icon: LayoutList },
    { href: `/profile/${profile.username}`, label: "Perfil", icon: User },
  ];
  const extra = [
    { href: "/notifications", label: "Avisos", icon: Bell },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    ...(profile.role === "ADMIN"
      ? [{ href: "/settings", label: "Configurações", icon: Settings }]
      : []),
  ];
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  async function logout() {
    setLeaving(true);
    // Unsubscribe before sign-out so a shared phone does not keep receiving alerts.
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          const { error: removeError } = await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          const removed = await sub.unsubscribe();
          if (removeError && !removed) throw new Error("unsubscribe");
        }
      }
    } catch {
      setError("Não foi possível desligar os avisos deste aparelho. Tente sair novamente.");
      setLeaving(false);
      return;
    }
    const { error: err } = await createClient().auth.signOut();
    if (err) {
      setError("Não foi possível sair. Tente novamente.");
      setLeaving(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="app-shell mx-auto flex min-h-screen max-w-6xl md:gap-8 md:px-6">
      <a href="#main-content" className="skip-link">Ir para o conteúdo</a>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-border py-8 pr-4 md:flex">
        <div>
          <Link
            href="/"
            className="mb-1 block px-3 text-xl font-semibold tracking-tight"
          >
            check-ins<span className="text-emerald-400">.</span>
          </Link>
          <p className="mb-10 px-3 text-xs text-muted">
            Planejar. Fazer. Celebrar.
          </p>
          <nav className="space-y-1" aria-label="Principal">
            {[...main, ...extra].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active(href) ? "bg-emerald-400/10 text-emerald-300" : "text-muted hover:bg-surface"}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/checkin/new"
            className="primary-button mt-7 w-full"
          >
            <Plus size={16} /> Novo check-in
          </Link>
        </div>
        <div>
          <ThemePicker />
          <p className="mb-3 px-3 text-sm text-muted">{profile.display_name}</p>
          <button
            disabled={leaving}
            onClick={logout}
            className="flex items-center gap-3 px-3 text-sm text-muted"
          >
            <LogOut size={16} /> {leaving ? "Saindo..." : "Sair"}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="main-panel min-h-screen min-w-0 w-full border-x border-border/60 pb-28 md:pb-8">
        <div className="mobile-toolbar flex items-center justify-between gap-2 border-b border-border/60 bg-surface px-4 py-2 md:hidden">
          <Link href="/" className="flex items-center gap-1.5 font-semibold"><Heart size={18} className="text-emerald-300" /> check-ins.</Link>
          <div className="flex items-center gap-1">
            <Link href="/notifications" className="icon-button" aria-label="Notificações"><Bell size={20} /></Link>
            <details ref={menu} className="relative">
              <summary className="icon-button cursor-pointer list-none" aria-label="Mais opções"><Menu size={21} /></summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-60 space-y-1 rounded-2xl border border-border bg-surface p-3 shadow-xl">
                {extra.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={e => e.currentTarget.closest("details")?.removeAttribute("open")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Icon size={17} />{label}</Link>)}
                <ThemePicker />
                <button disabled={leaving} onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-muted"><LogOut size={17} />{leaving ? "Saindo…" : "Sair da conta"}</button>
              </div>
            </details>
          </div>
        </div>
        {error && (
          <p role="alert" className="p-3 text-sm text-red-300 md:hidden">
            {error}
          </p>
        )}
        <div key={pathname} className="page-enter">{children}</div>
      </main>
      <nav
        aria-label="Principal no celular"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-bg/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden"
      >
        {[...main.slice(0, 2), { href: "/checkin/new", label: "Check-in", icon: Plus }, ...main.slice(2)].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 text-xs ${active(href) ? "text-emerald-300" : "text-muted"}`}
          >
            <Icon size={21} className={href === "/checkin/new" ? "rounded-md bg-emerald-300 text-black" : undefined} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
