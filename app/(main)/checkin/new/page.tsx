import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import CheckinForm from "@/components/CheckinForm";
import { getSession, getCategories } from "@/lib/session";
import { todayKey } from "@/lib/dates";
import type { PlanningItem } from "@/lib/types";
export default async function NewCheckinPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const [{ supabase, user }, categories] = await Promise.all([
    getSession(),
    getCategories(),
  ]);
  let plan: PlanningItem | null = null;
  if (searchParams.plan) {
    if (!/^[\da-f-]{36}$/i.test(searchParams.plan)) notFound();
    const { data, error } = await supabase
      .from("planning_items")
      .select("*,categories(id,name,icon,color),checkins(id)")
      .eq("id", searchParams.plan)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a atividade.");
    if (!data) notFound();
    plan = data as PlanningItem;
    if (plan.checkins) redirect(`/checkin/${plan.checkins.id}`);
    if (plan.cancelled || plan.planned_date > todayKey())
      return (
        <div className="p-6">
          <h1 className="text-lg font-semibold">
            {plan.cancelled
              ? "Esta atividade foi cancelada"
              : "Ainda não chegou o dia desta atividade"}
          </h1>
          <Link
            className="mt-4 inline-block underline"
            href={`/agenda?date=${plan.planned_date}`}
          >
            Voltar à agenda
          </Link>
        </div>
      );
  }
  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Celebre o que você fez</p>
        <h1>{plan ? "Concluir atividade" : "Novo check-in"}</h1>
      </header>
      <CheckinForm categories={categories} plan={plan} authUserId={user.id} />
    </div>
  );
}
