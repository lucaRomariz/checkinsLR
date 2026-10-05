import PushSettings from "@/components/PushSettings";
import { getSession } from "@/lib/session";

export default async function NotificationsPage() {
  await getSession();
  return <div>
    <header className="page-header"><p className="eyebrow">Um lembrete para o que importa</p><h1>Notificações</h1><p className="mt-2 text-sm text-muted">Escolha como acompanhar sua agenda e as novas conquistas.</p></header>
    <PushSettings />
  </div>;
}
