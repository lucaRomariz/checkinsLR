import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// React cache only shares this value within the current server render/request.
export const getSession = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user) {
    if (error && error.status && error.status >= 500)
      throw new Error(
        "Não foi possível verificar sua sessão. Tente novamente.",
      );
    redirect("/login");
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single<Profile>();
  if (profileError || !profile)
    throw new Error("Não foi possível carregar seu perfil. Tente novamente.");
  return { supabase, user, profile };
});

export const getCategories = cache(async () => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error("Não foi possível carregar as categorias.");
  return data;
});
export const getSettings = cache(async () => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_key,setting_value");
  if (error) throw new Error("Não foi possível carregar as configurações.");
  return Object.fromEntries(
    data.map((s) => [s.setting_key, s.setting_value]),
  ) as Record<string, string>;
});
