import { Bell, Camera } from "lucide-react";
import Link from "next/link";
import Agenda from "@/components/Agenda";
import { getCategories, getSession } from "@/lib/session";
import { getPlans } from "@/lib/planning";
import { todayKey } from "@/lib/dates";
export default async function TodayPage() {
  const day = todayKey();
  const [items, categories, { profile }] = await Promise.all([
    getPlans(day, day),
    getCategories(),
    getSession(),
  ]);
  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Pequenos passos, grandes conquistas ✨</p>
        <div className="flex items-center justify-between gap-3">
          <h1>Oi, {profile.display_name.split(" ")[0]} 👋</h1>
          <Link
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted"
            href="/checkin/new"
          >
            ＋ Registrar conquista
          </Link>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 px-5 pt-5 sm:grid-cols-2">
        <Link href="/checkin/new" className="quick-link"><span className="icon-tile"><Camera size={21} /></span><span className="min-w-0"><strong className="block text-sm">Registrar conquista</strong><span className="text-xs text-muted">Conte como foi, com uma foto</span></span></Link>
        <Link href="/notifications" className="quick-link"><span className="icon-tile"><Bell size={21} /></span><span className="min-w-0"><strong className="block text-sm">Seus lembretes</strong><span className="text-xs text-muted">Ative os avisos da agenda</span></span></Link>
      </div>
      <Agenda
        key={day}
        home
        day={day}
        view="day"
        items={items}
        categories={categories}
      />
    </div>
  );
}
