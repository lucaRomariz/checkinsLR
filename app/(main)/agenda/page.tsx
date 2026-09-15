import Agenda from "@/components/Agenda";
import { getCategories } from "@/lib/session";
import { getPlans } from "@/lib/planning";
import { todayKey, validDate, weekStart, addDays } from "@/lib/dates";
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { date?: string; view?: string };
}) {
  const day = validDate(searchParams.date) ? searchParams.date : todayKey();
  const view = searchParams.view === "week" ? "week" : "day";
  const start = view === "week" ? weekStart(day) : day;
  const end = view === "week" ? addDays(start, 6) : day;
  const [items, categories] = await Promise.all([
    getPlans(start, end),
    getCategories(),
  ]);
  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Dê espaço ao que importa</p>
        <h1>Minha agenda</h1>
        <p className="mt-2 text-sm text-muted">Defina um horário de início e ative os avisos para receber um lembrete ⏰</p>
      </header>
      <Agenda
        key={`${day}-${view}`}
        day={day}
        view={view}
        items={items}
        categories={categories}
      />
    </div>
  );
}
