export const APP_TIME_ZONE = "America/Sao_Paulo";

export function todayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T12:00:00Z");
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(day: string, amount: number): string {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function weekStart(day: string): string {
  const dow = new Date(day + "T12:00:00Z").getUTCDay();
  return addDays(day, -(dow === 0 ? 6 : dow - 1));
}
export function dateLabel(day: string): string {
  const today = todayKey();
  if (day === today) return "Hoje";
  if (day === addDays(today, -1)) return "Ontem";
  return new Date(day + "T12:00:00Z").toLocaleDateString("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });
}
export function isOverdue(
  date: string,
  end: string | null,
  now = new Date(),
): boolean {
  const today = todayKey(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return date < today || (date === today && !!end && end.slice(0, 5) < time);
}
