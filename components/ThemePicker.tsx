"use client";
import { useEffect, useState } from "react";
import { SunMoon } from "lucide-react";

type Theme = "system" | "light" | "dark";
let sessionTheme: Theme | undefined;
export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("checkins-theme"); } catch { /* Session preference still works. */ }
      const value = sessionTheme ?? (saved === "dark" || saved === "light" ? saved : "system");
      setTheme(value);
      document.documentElement.classList.toggle("dark", value === "dark" || (value === "system" && media.matches));
    };
    sync();
    media.addEventListener("change", sync);
    const storageSync = (event: StorageEvent) => {
      if (event.key && event.key !== "checkins-theme") return;
      sessionTheme = undefined;
      sync();
    };
    window.addEventListener("storage", storageSync);
    window.addEventListener("checkins-theme-change", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", storageSync); window.removeEventListener("checkins-theme-change", sync); };
  }, []);
  return <label className="my-2 flex items-center gap-2 text-xs text-muted">
    <SunMoon size={18} aria-hidden="true" />
    <span className="sr-only">Aparência</span>
    <select aria-label="Aparência" className="min-h-11 rounded-xl px-2" value={theme} onChange={event => {
      const value = event.target.value as Theme;
      sessionTheme = value;
      setTheme(value);
      try { localStorage.setItem("checkins-theme", value); } catch { /* Apply for this page. */ }
      document.documentElement.classList.toggle("dark", value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches));
      window.dispatchEvent(new Event("checkins-theme-change"));
    }}>
      <option value="system">Tema do aparelho</option><option value="light">☀ Claro</option><option value="dark">☾ Escuro</option>
    </select>
  </label>;
}
