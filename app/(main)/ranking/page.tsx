import Ranking from "@/components/Ranking";
import { getSettings } from "@/lib/session";
export default async function RankingPage() {
  const s = await getSettings();
  const period = ["today", "week", "month", "all"].includes(
    s.ranking_default_period,
  )
    ? s.ranking_default_period
    : "week";
  return (
    <Ranking
      initialPeriod={period as "today" | "week" | "month" | "all"}
      enabled={s.ranking_enabled !== "false"}
      byCategory={s.ranking_by_category !== "false"}
    />
  );
}
