"use client";
import ThemePicker from "./ThemePicker";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Home,
  LayoutList,
  Trophy,
  User,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { useState } from "react";
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
    <div className="mx-auto flex min-h-screen max-w-6xl md:gap-8 md:px-6">
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
            className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-medium text-black"
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
      <main className="min-h-screen min-w-0 w-full max-w-2xl border-x border-border/60 pb-28 md:pb-8">
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 border-b border-border/60 mobile-toolbar px-4 text-xs text-muted md:hidden">
          <ThemePicker />
          {extra.map((e) => (
            <Link key={e.href} href={e.href}>
              {e.label}
            </Link>
          ))}
          <button disabled={leaving} onClick={logout}>
            Sair
          </button>
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
        {main.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs ${active(href) ? "text-emerald-300" : "text-muted"}`}
          >
            <Icon size={21} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
