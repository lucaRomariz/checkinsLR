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
        <p className="eyebrow">Uma atividade de cada vez</p>
        <div className="flex items-center justify-between gap-3">
          <h1>Olá, {profile.display_name.split(" ")[0]}</h1>
          <Link
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted"
            href="/checkin/new"
          >
            Check-in avulso
          </Link>
        </div>
      </header>
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
