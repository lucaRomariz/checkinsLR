// Run only with a disposable account. This creates records owned by that account.
// QA_CREDENTIALS_FILE is an explicit JSON file with {email,password}; never commit it.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
async function main() {
  if (!process.env.QA_CREDENTIALS_FILE)
    throw new Error("Set QA_CREDENTIALS_FILE to a disposable test account.");
  const env = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim()];
      }),
  );
  const { email, password } = JSON.parse(
    fs.readFileSync(process.env.QA_CREDENTIALS_FILE, "utf8"),
  );
  if (!email.endsWith("@example.invalid"))
    throw new Error("Use a disposable example.invalid account.");
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data: auth, error: loginError } =
    await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  const { data: categories, error: categoryError } = await client
    .from("categories")
    .select("id")
    .eq("active", true)
    .limit(1);
  if (categoryError) throw categoryError;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const { data: plan, error: planError } = await client.rpc("save_plan", {
    p_id: null,
    p_category_id: categories[0].id,
    p_title: "QA concorrência",
    p_notes: null,
    p_date: today,
    p_start: null,
    p_end: null,
    p_cancelled: false,
  });
  if (planError) throw planError;
  const calls = await Promise.all(
    Array.from({ length: 6 }, () =>
      client.rpc("record_checkin", {
        p_category_id: categories[0].id,
        p_planning_item_id: plan.id,
        p_request_id: randomUUID(),
      }),
    ),
  );
  for (const result of calls) if (result.error) throw result.error;
  assert.equal(
    new Set(calls.map((r) => r.data.id)).size,
    1,
    "Concurrent completion must return the same check-in",
  );
  const { data: loaded, error: loadError } = await client
    .from("planning_items")
    .select("id,checkins(id)")
    .eq("id", plan.id)
    .single();
  if (loadError) throw loadError;
  assert.equal(
    loaded.checkins.id,
    calls[0].data.id,
    "One-to-one relation must match",
  );
  const { error: deleteError } = await client.rpc("delete_checkin", {
    p_id: calls[0].data.id,
  });
  if (deleteError) throw deleteError;
  const { data: reopened } = await client
    .from("planning_items")
    .select("id,checkins(id)")
    .eq("id", plan.id)
    .single();
  assert.equal(reopened.checkins, null);
  const anonymous = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { error: anonymousError } = await anonymous
    .from("profiles")
    .select("id");
  assert.ok(anonymousError);
  console.log(
    "PASS: 6 concurrent requests -> 1 check-in; one-to-one relationship, reopening and anonymous access blocked.",
  );
  await client.auth.signOut();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
