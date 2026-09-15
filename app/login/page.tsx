"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCheck, Eye, EyeOff, Heart, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import ThemePicker from "@/components/ThemePicker";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const lock = useRef(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true; setLoading(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() || username.trim() } },
        });
        if (error) throw error;
        if (!data.session) { setNotice("Conta criada! Confira seu e-mail para confirmar e depois entre."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      router.push("/"); router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message === "Invalid login credentials" ? "E-mail ou senha incorretos. Confira e tente novamente." : err instanceof Error ? err.message : "Não foi possível conectar. Tente novamente.");
    } finally { lock.current = false; setLoading(false); }
  }

  return <main className="login-layout">
    <section className="login-story" aria-label="Nossa rotina, nossas conquistas">
      <Image src="/login-photo.jpg" alt="Casal sorrindo e abraçado à noite" fill priority sizes="(min-width: 900px) 50vw, 100vw" className="object-cover" style={{ objectPosition: "center 60%" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/25" />
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-10">
        <span className="flex items-center gap-2 text-lg font-semibold text-white"><Heart size={22} className="text-emerald-300" /> check-ins.</span>
        <div className="max-w-md text-white">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-xs backdrop-blur"><Sparkles size={14} /> A vida acontece nos pequenos passos</span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Uma rotina com mais<br />momentos juntos.</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">Planeje o dia, registre suas conquistas e celebre cada passo.</p>
        </div>
      </div>
    </section>
    <section className="flex flex-col px-6 py-5 sm:px-10 lg:px-16">
      <div className="flex justify-end"><ThemePicker /></div>
      <div className="mx-auto w-full max-w-sm flex-1 py-6 lg:flex lg:flex-col lg:justify-center">
        <span className="icon-tile mb-5"><CheckCheck size={25} /></span>
        <p className="eyebrow">Seu espaço para crescer</p>
        <h2 className="text-3xl font-semibold tracking-tight">{mode === "signin" ? "Que bom ter você aqui" : "Vamos começar?"}</h2>
        <p className="mb-6 mt-2 text-sm text-muted">{mode === "signin" ? "Entre e dê o próximo passo no seu dia." : "Crie sua conta e faça parte dessa rotina."}</p>
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface2 p-1" role="group" aria-label="Acesso à conta">
          {(["signin", "signup"] as const).map(value => <button key={value} type="button" disabled={loading} aria-pressed={mode === value} className={`min-h-11 rounded-xl text-sm font-medium ${mode === value ? "bg-surface text-accent shadow-sm" : "text-muted"}`} onClick={() => { setMode(value); setError(""); setNotice(""); }}>{value === "signin" ? "Entrar" : "Criar conta"}</button>)}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={loading} className="space-y-4">
            {mode === "signup" && <>
              <label className="field"><span className="flex items-center gap-2"><UserRound size={16} /> Nome de usuário</span><input autoComplete="username" autoCapitalize="none" value={username} onChange={e => setUsername(e.target.value)} placeholder="seu.nome" required /></label>
              <label className="field">Como podemos chamar você?<input autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Seu nome" /></label>
            </>}
            <label className="field"><span className="flex items-center gap-2"><Mail size={16} /> E-mail</span><input type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required /></label>
            <label className="field"><span className="flex items-center gap-2"><LockKeyhole size={16} /> Senha</span><span className="relative"><input type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Pelo menos 6 caracteres" style={{ paddingRight: 52 }} /><button type="button" className="absolute right-1 top-1 icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
            {notice && <p role="status" className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-300">{notice}</p>}
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
            <button type="submit" className="primary-button w-full">{loading ? "Conectando…" : mode === "signin" ? "Vamos para o seu dia" : "Criar minha conta"}<ArrowRight size={18} /></button>
          </fieldset>
        </form>
        <p className="mt-7 flex items-center justify-center gap-2 text-xs text-muted"><CalendarDays size={15} /> Planejar. Fazer. Celebrar.</p>
      </div>
    </section>
  </main>;
}
