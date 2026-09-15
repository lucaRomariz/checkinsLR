import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

function allowedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = req.headers.get("x-push-secret");
  if (!secret || secret.length !== 64) return new Response("Unauthorized", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: config, error: configError } = await db.rpc("push_worker_config", { p_secret: secret });
  if (configError) return new Response("Configuration unavailable", { status: 503 });
  if (!config) return new Response("Unauthorized", { status: 401 });
  if (!config.publicKey || !config.privateKey || !config.subject) return new Response("Not configured", { status: 503 });
  const { data: jobs, error } = await db.rpc("claim_push_deliveries");
  if (error) return new Response("Queue unavailable", { status: 503 });
  let sent = 0;
  // Bounded parallel batches; each delivery has a database lease for crash recovery.
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(jobs.slice(offset, offset + 5).map(async (job: { id: string; checkin_id: string; subscription_id: string; attempts: number }) => {
      const { data: sub, error: subError } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("id", job.subscription_id).maybeSingle();
      if (subError) return; // Lease expires; retry later.
      if (!sub) return; // Subscription and its jobs were deleted by the user.
      let status = 0;
      try {
        if (!allowedEndpoint(sub.endpoint)) status = 400;
        else {
          const { data: payload, error: payloadError } = await db.rpc("push_delivery_payload", { p_delivery_id: job.id });
          if (payloadError) return; // Retry after the lease expires.
          if (!payload) {
            await db.from("push_deliveries").update({ status: "failed", last_status: 204 }).eq("id", job.id);
            return; // Completed, cancelled, rescheduled, expired or deleted.
          }
          const details = webpush.generateRequestDetails({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
            TTL: payload.ttl, urgency: payload.kind === "agenda" ? "high" : "normal",
            vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
          });
          // Do not follow redirects from user-provided endpoints.
          const response = await fetch(details.endpoint, { method: "POST", headers: details.headers, body: details.body, redirect: "error", signal: AbortSignal.timeout(10000) });
          status = response.status;
          await response.body?.cancel();
        }
      } catch { status = 0; }
      if (status === 404 || status === 410) {
        await db.from("push_subscriptions").delete().eq("id", job.subscription_id);
        return;
      }
      const success = status >= 200 && status < 300;
      if (success) sent++;
      const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
      await db.from("push_deliveries").update({
        status: success ? "sent" : permanent || job.attempts >= 5 ? "failed" : "pending",
        last_status: status,
        available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000).toISOString(),
      }).eq("id", job.id);
    }));
  }
  return Response.json({ processed: jobs.length, sent });
});
