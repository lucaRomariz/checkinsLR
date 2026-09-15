"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PushSettings() {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setIos(isIos); setInstalled(standalone);
      const canPush = window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setSupported(canPush);
      if (!canPush || (isIos && !standalone)) { setReady(true); return; }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const supabase = createClient();
        const { data: key, error } = await supabase.rpc("get_push_public_key");
        if (error || !key) throw new Error("As notificações ainda não estão configuradas. Tente novamente mais tarde.");
        let active = false;
        if (sub) {
          const { data, error: lookupError } = await supabase.from("push_subscriptions").select("id").eq("endpoint", sub.endpoint).maybeSingle();
          if (lookupError) throw new Error("Não foi possível verificar este aparelho. Recarregue a página.");
          active = Boolean(data) && Notification.permission === "granted";
        }
        if (!cancelled) { setRegistration(reg); setPublicKey(key); setEnabled(active); }
      } catch (err) { if (!cancelled) setMessage(err instanceof Error ? err.message : "Não foi possível preparar as notificações."); }
      finally { if (!cancelled) setReady(true); }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    if (!registration) return;
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (enabled) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          if (error) throw new Error("Não foi possível desativar. Tente novamente.");
          await sub.unsubscribe();
        }
        setEnabled(false); setMessage("Notificações desativadas neste aparelho.");
      } else {
        // Request permission directly from the tap, before any network call (iOS).
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error(permission === "denied" ? "Permissão bloqueada. No iPhone, abra Ajustes → Notificações → Check-ins e permita os avisos. Em outros aparelhos, confira as permissões do site no navegador." : "Permissão não concedida. Toque em ativar quando quiser tentar novamente.");
        let sub = await registration.pushManager.getSubscription();
        // A subscription can remain in a browser shared by different accounts.
        // Recreate it so it cannot stay attached to the previous account.
        if (sub) await sub.unsubscribe();
        const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
        const applicationServerKey = Uint8Array.from(raw, c => c.charCodeAt(0));
        sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        const { error } = await supabase.rpc("register_push_subscription", { p_subscription: sub.toJSON() });
        if (error) { await sub.unsubscribe(); throw new Error("A permissão foi concedida, mas não conseguimos cadastrar o aparelho. Tente ativar novamente."); }
        setEnabled(true); setMessage("Tudo pronto! Você receberá novos check-ins e lembretes da sua agenda.");
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível alterar as notificações."); }
    finally { setBusy(false); }
  }

  async function testNotification() {
    if (!registration || busy) return;
    setBusy(true); setMessage("");
    try {
      await registration.showNotification("Seu próximo passo merece comemoração 🎉", {
        body: "O teste de aviso neste aparelho funcionou!", icon: "/icons/icon-192.png",
        tag: "checkins-local-test", data: { url: "/feed" },
      });
      setMessage("Aviso de teste solicitado. Este teste verifica o aparelho; o envio pelo servidor é confirmado com um check-in de outra conta.");
    } catch { setMessage("Não foi possível mostrar o aviso. Confira a permissão de notificações e o modo Foco."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5 p-4">
    <section className="rounded-2xl border border-border bg-surface p-5">
      <Bell className="mb-3 text-emerald-300" aria-hidden="true" />
      <h2 className="text-lg font-semibold">Uma conquista nova? A gente avisa ✨</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Receba avisos quando outra pessoa publicar e lembretes no início das suas atividades da agenda. Toque para abrir o check-in ou o dia planejado.</p>
      <p className="mt-3 text-sm">{!ready ? "Preparando notificações…" : enabled ? "Ativadas neste aparelho" : "Desativadas neste aparelho"}</p>
      {ready && ios && !installed ? <p className="mt-3 text-sm text-emerald-300">Primeiro, adicione o app à tela inicial seguindo os passos abaixo.</p> : ready && !supported ? <p className="mt-3 text-sm text-muted">Este navegador não permite notificações aqui. Abra o endereço publicado no Safari do iPhone ou em um navegador atualizado no Android.</p> : <button onClick={toggle} disabled={!ready || busy || !registration || !publicKey} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black disabled:opacity-50">{enabled ? <BellOff size={18} /> : <Bell size={18} />}{busy ? "Aguarde…" : enabled ? "Desativar neste aparelho" : "Ativar notificações"}</button>}
      {enabled && <button type="button" disabled={busy} onClick={testNotification} className="mt-3 min-h-12 w-full rounded-xl border border-border px-4 py-3 text-sm">Testar aviso neste aparelho</button>}
      <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed">{message}</p>
    </section>
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-semibold">⏰ Um empurrãozinho para seus planos</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Com os avisos ativados, lembramos você no horário de início das atividades, no fuso de Brasília. Só você recebe os lembretes da sua agenda.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">Defina um horário de início ao planejar. Atividades sem horário, canceladas ou já concluídas não geram novos lembretes. Se reagendar, usamos o novo horário.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">A verificação acontece a cada minuto. Pode haver atraso de rede ou do aparelho; lembretes vencem 15 minutos após o início. Um aviso já enviado pode continuar visível mesmo após concluir ou reagendar.</p>
    </section>
    <section className="rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Smartphone size={20} /> Como ativar no iPhone</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
        <li>Use um iPhone com iOS 16.4 ou mais recente e abra o endereço do app no <strong className="text-accent">Safari</strong>.</li>
        <li>Toque em <strong className="text-accent">Compartilhar → Adicionar à Tela de Início → Adicionar</strong>. Dependendo da versão do Safari, Compartilhar fica no menu de mais opções.</li>
        <li>Abra <strong className="text-accent">Check-ins pelo ícone da tela inicial</strong> e entre na sua conta.</li>
        <li>Volte a <strong className="text-accent">Notificações</strong>, toque em <strong className="text-accent">Ativar notificações</strong> e escolha <strong className="text-accent">Permitir</strong>.</li>
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-muted">Se os avisos não aparecerem, confira Ajustes → Notificações → Check-ins e o modo Foco. A entrega depende da conexão e das configurações do aparelho. Ative separadamente em cada dispositivo. Ao sair da conta, os avisos deste navegador são desativados.</p>
    </section>
  </div>;
}
