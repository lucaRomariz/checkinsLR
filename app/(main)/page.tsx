import { Bell, Camera } from "lucide-react";
import Link from "next/link";
import Agenda from "@/components/Agenda";
import { getCategories, getSession } from "@/lib/session";
import { getPlans } from "@/lib/planning";
import { APP_TIME_ZONE, todayKey } from "@/lib/dates";
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
        <h1 className="break-words">Oi, {profile.display_name.trim().split(" ")[0]} 👋</h1>
        <p className="mt-2 text-sm capitalize text-muted">
          {new Date(day + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long" })}
        </p>
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
