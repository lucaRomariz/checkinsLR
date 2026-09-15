import PushSettings from "@/components/PushSettings";
import { getSession } from "@/lib/session";

export default async function NotificationsPage() {
  await getSession();
  return <div>
    <header className="border-b border-border/60 px-4 py-4"><h1 className="text-lg font-semibold">Notificações</h1></header>
    <PushSettings />
  </div>;
}
