'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Trophy, User, Settings, Plus, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export default function NavShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/ranking', label: 'Ranking', icon: Trophy },
    { href: `/profile/${profile.username}`, label: 'Perfil', icon: User },
  ];
  if (profile.role === 'ADMIN') {
    navItems.push({ href: '/settings', label: 'Config.', icon: Settings });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl md:gap-8 md:px-6">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-col justify-between border-r border-border py-8 pr-4 md:flex">
        <div>
          <div className="mb-10 px-2 text-lg font-semibold">Check-ins</div>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive(href) ? 'bg-surface2 text-accent' : 'text-muted hover:text-accent'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/checkin/new"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
          >
            <Plus size={16} /> Novo check-in
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:text-accent"
        >
          <LogOut size={18} /> Sair
        </button>
      </aside>

      {/* Main content */}
      <main className="min-h-screen w-full max-w-2xl border-x border-border/60 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg/95 px-2 py-2 backdrop-blur md:hidden">
        {navItems.slice(0, 1).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-xs ${
              isActive(href) ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        <Link
          href="/checkin/new"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg"
        >
          <Plus size={26} />
        </Link>
        {navItems.slice(1).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 text-xs ${
              isActive(href) ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
