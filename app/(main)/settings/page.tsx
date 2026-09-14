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
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-semibold">⚙️ Configurações</h1>
      </header>
      <SettingsForm
        initialSettings={(settings as SystemSetting[]) ?? []}
        initialCategories={(categories as Category[]) ?? []}
        admins={(admins as Profile[]) ?? []}
      />
    </div>
  );
}
