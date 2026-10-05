import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SettingsForm from "@/components/SettingsForm";
import type { Category, Profile, SystemSetting } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase, profile } = await getSession();

  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }

  const results = await Promise.all([
    supabase.from("system_settings").select("*").order("setting_key"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("profiles").select("*").eq("role", "ADMIN"),
  ]);

  if (results.some((r) => r.error))
    throw new Error("Não foi possível carregar as configurações.");
  const [{ data: settings }, { data: categories }, { data: admins }] = results;

  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Do seu jeito</p>
        <h1>Configurações</h1>
        <p className="mt-2 text-sm text-muted">Personalize as regras de check-ins, categorias e interações.</p>
      </header>
      <SettingsForm
        initialSettings={(settings as SystemSetting[]) ?? []}
        initialCategories={(categories as Category[]) ?? []}
        admins={(admins as Profile[]) ?? []}
      />
    </div>
  );
}
