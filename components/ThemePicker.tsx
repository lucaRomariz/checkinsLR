"use client";
import { useEffect, useState } from "react";
import { SunMoon } from "lucide-react";

type Theme = "system" | "light" | "dark";
export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("checkins-theme"); } catch { /* Session preference still works. */ }
      const value = saved === "dark" || saved === "light" ? saved : "system";
      setTheme(value);
      document.documentElement.classList.toggle("dark", value === "dark" || (value === "system" && media.matches));
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, []);
  return <label className="my-2 flex items-center gap-2 text-xs text-muted">
    <SunMoon size={18} aria-hidden="true" />
    <span className="sr-only">Aparência</span>
    <select aria-label="Aparência" className="min-h-11 rounded-xl px-2" value={theme} onChange={event => {
      const value = event.target.value as Theme;
      setTheme(value);
      try { localStorage.setItem("checkins-theme", value); } catch { /* Apply for this page. */ }
      document.documentElement.classList.toggle("dark", value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches));
    }}>
      <option value="system">Tema do aparelho</option><option value="light">☀ Claro</option><option value="dark">☾ Escuro</option>
    </select>
  </label>;
}
