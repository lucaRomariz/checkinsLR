import { getSession } from "./session";
import type { PlanningItem } from "./types";
export async function getPlans(start: string, end: string) {
  const { supabase, profile } = await getSession();
  const { data, error } = await supabase
    .from("planning_items")
    .select("*, categories(id,name,icon,color), checkins(id)")
    .eq("user_id", profile.id)
    .gte("planned_date", start)
    .lte("planned_date", end)
    .order("planned_date")
    .order("start_time", { nullsFirst: false })
    .order("id")
    .limit(400);
  if (error) throw new Error("Não foi possível carregar seu planejamento.");
  return data as PlanningItem[];
}
