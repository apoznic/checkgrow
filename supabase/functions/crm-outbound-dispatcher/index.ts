import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Outbound webhook dispatcher. Sends queued lead events to the URLs
 * configured in CRM → Webhooks → Outbound, with signatures and retries.
 *
 * Called by:
 *  - the database trigger right after a delivery is queued (header `x-runner-secret`)
 *  - the database scheduler every 5 minutes (same header)
 *  - the app, with a manager's JWT and { cluster_id }:
 *      { delivery_id }            retry one delivery now
 *      { test: { webhook_id } }   send a sample lead to one webhook
 *
 * Every request carries:
 *   x-webhook-id          delivery id
 *   x-webhook-timestamp   unix seconds
 *   x-webhook-signature   v1,<base64 HMAC-SHA256 of "<id>.<timestamp>.<body>">   (Standard Webhooks)
 *   x-signature           sha256=<hex HMAC-SHA256 of the body>
 *   x-webhook-event       event name
 * Retries: 1, 5, 15, 60, 360, 1440 minutes; after 6 attempts the delivery is failed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-runner-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Json = Record<string, unknown>;
const BACKOFF_MINUTES = [1, 5, 15, 60, 360, 1440];
const MAX_ATTEMPTS = BACKOFF_MINUTES.length;

interface Webhook {
  id: string; cluster_id: string; name: string; url: string; enabled: boolean; secret: string;
  events: string[]; payload_format: "envelope" | "flat"; headers: Record<string, string> | null;
}
interface Delivery {
  id: string; webhook_id: string; cluster_id: string; event: string; deal_id: string | null;
  data: Json; status: string; attempts: number;
  crm_outbound_webhooks: Webhook | null;
}

const hmac = async (secret: string, data: string) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return {
    hex: Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join(""),
    b64: btoa(String.fromCharCode(...sig)),
  };
};

// Pipeline stages mapped onto the status vocabulary most lead tools use
// (Checkgrow validates "status" and rejects anything outside this list).
const STATUS_FOR_STAGE: Record<string, string> = {
  lead: "new", qualified: "qualified", proposal: "contacted", negotiation: "contacted", won: "won", lost: "lost", archived: "lost",
};
const statusFor = (stage: unknown): string | null => (typeof stage === "string" ? STATUS_FOR_STAGE[stage] ?? null : null);

const SAMPLE_LEAD = {
  id: "00000000-0000-0000-0000-000000000000",
  title: "Test lead from CheckGrow CRM",
  description: "This is a test delivery. Safe to delete.",
  stage: "lead",
  previous_stage: null,
  value: 1500,
  currency: "EUR",
  probability: 20,
  source: "CheckGrow CRM",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  closed_at: null,
  assigned_to: null as null | { id: string; name: string | null },
  contact: { id: "00000000-0000-0000-0000-000000000001", name: "Test Lead", email: "test-lead@example.com", phone: "+385 00 000 0000", company: "Example d.o.o.", position: "Owner" } as null | Json,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: Json = {};
  try { body = await req.json(); } catch { body = {}; }

  // ---- Authentication: scheduler secret or an org manager's JWT ----
  let clusterFilter: string | null = null;
  let profileId: string | null = null;
  const secretHeader = req.headers.get("x-runner-secret");
  const { data: config } = await admin.from("automation_runner_config").select("secret").eq("id", 1).maybeSingle();
  if (secretHeader && config?.secret && secretHeader === config.secret) {
    clusterFilter = typeof body.cluster_id === "string" ? body.cluster_id : null;
  } else {
    const authHeader = req.headers.get("Authorization") || "";
    const clusterId = typeof body.cluster_id === "string" ? body.cluster_id : null;
    if (!authHeader.startsWith("Bearer ") || !clusterId) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isManager } = await userClient.rpc("has_org_role", { _user_id: userData.user.id, _cluster_id: clusterId, _roles: ["owner", "admin"] });
    if (!isManager) return json({ error: "Forbidden" }, 403);
    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
    profileId = profile?.id ?? null;
    clusterFilter = clusterId;
  }

  // ---- Optional one-off actions ----
  let onlyDeliveryId: string | null = null;
  const test = body.test as { webhook_id?: string } | undefined;
  if (test?.webhook_id && clusterFilter) {
    const { data: hook } = await admin.from("crm_outbound_webhooks").select("id, cluster_id").eq("id", test.webhook_id).eq("cluster_id", clusterFilter).maybeSingle();
    if (!hook) return json({ error: "Webhook not found" }, 404);
    const { data: created, error } = await admin.from("crm_outbound_deliveries").insert({
      webhook_id: hook.id, cluster_id: hook.cluster_id, event: "lead.test", deal_id: null,
      data: { test: true, requested_by: profileId }, status: "pending", next_attempt_at: new Date().toISOString(),
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    onlyDeliveryId = created.id;
  } else if (typeof body.delivery_id === "string") {
    let q = admin.from("crm_outbound_deliveries")
      .update({ status: "pending", next_attempt_at: new Date().toISOString(), last_error: null })
      .eq("id", body.delivery_id);
    if (clusterFilter) q = q.eq("cluster_id", clusterFilter);
    const { data: retried } = await q.select("id").maybeSingle();
    if (!retried) return json({ error: "Delivery not found" }, 404);
    onlyDeliveryId = retried.id;
  }

  // ---- Fetch due deliveries ----
  let query = admin
    .from("crm_outbound_deliveries")
    .select("id, webhook_id, cluster_id, event, deal_id, data, status, attempts, crm_outbound_webhooks ( id, cluster_id, name, url, enabled, secret, events, payload_format, headers )")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(50);
  if (onlyDeliveryId) query = query.eq("id", onlyDeliveryId);
  else if (clusterFilter) query = query.eq("cluster_id", clusterFilter);
  const { data: due, error: dueError } = await query;
  if (dueError) return json({ error: dueError.message }, 500);

  const results: Json[] = [];
  for (const d of (due || []) as unknown as Delivery[]) {
    const hook = d.crm_outbound_webhooks;
    if (!hook) continue;
    if (!hook.enabled && d.event !== "lead.test") continue; // paused: leave it queued

    // Claim so a parallel invocation skips it
    const { data: claimed } = await admin.from("crm_outbound_deliveries")
      .update({ next_attempt_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
      .eq("id", d.id).eq("status", "pending").eq("attempts", d.attempts)
      .select("id").maybeSingle();
    if (!claimed) continue;

    const attempt = d.attempts + 1;
    const fail = async (error: string, statusCode: number | null, responseBody: string | null, requestBody: unknown) => {
      const exhausted = attempt >= MAX_ATTEMPTS;
      await admin.from("crm_outbound_deliveries").update({
        attempts: attempt,
        status: exhausted ? "failed" : "pending",
        next_attempt_at: exhausted ? new Date().toISOString() : new Date(Date.now() + BACKOFF_MINUTES[attempt - 1] * 60000).toISOString(),
        last_status_code: statusCode, last_error: error.slice(0, 500), response_body: responseBody?.slice(0, 1000) ?? null,
        request_body: requestBody ?? null,
      }).eq("id", d.id);
      if (exhausted) {
        const { data: w } = await admin.from("crm_outbound_webhooks").select("failed_count").eq("id", hook.id).maybeSingle();
        await admin.from("crm_outbound_webhooks").update({ failed_count: (w?.failed_count ?? 0) + 1, last_status_code: statusCode }).eq("id", hook.id);
      }
      results.push({ delivery: d.id, status: exhausted ? "failed" : "retry", error });
    };

    // ---- Build the lead object ----
    let lead: Json;
    if (d.event === "lead.test") {
      lead = { ...SAMPLE_LEAD };
    } else {
      const { data: deal } = await admin.from("crm_deals")
        .select("id, title, description, stage, value, currency, probability, source, created_at, updated_at, closed_at, assigned_to, crm_contacts ( id, name, email, phone, company, position ), profiles:assigned_to ( id, full_name )")
        .eq("id", d.deal_id ?? "").maybeSingle();
      if (!deal) { await fail("Lead no longer exists", null, null, null); continue; }
      const dealRow = deal as unknown as Json & { crm_contacts: Json | null; profiles: { id: string; full_name: string | null } | null };
      lead = {
        id: dealRow.id, title: dealRow.title, description: dealRow.description, stage: dealRow.stage,
        previous_stage: (d.data?.previous_stage as string) ?? null,
        value: dealRow.value, currency: dealRow.currency, probability: dealRow.probability, source: dealRow.source,
        created_at: dealRow.created_at, updated_at: dealRow.updated_at, closed_at: dealRow.closed_at,
        assigned_to: dealRow.profiles ? { id: dealRow.profiles.id, name: dealRow.profiles.full_name } : null,
        contact: dealRow.crm_contacts ?? null,
      };
    }

    const sentAt = new Date().toISOString();
    let payload: Json;
    if (hook.payload_format === "flat") {
      const c = (lead.contact as Json | null) ?? {};
      payload = {
        event: d.event, delivery_id: d.id, sent_at: sentAt,
        external_id: lead.id, lead_id: lead.id,
        name: c.name ?? lead.title ?? null, email: c.email ?? null, phone: c.phone ?? null, company: c.company ?? null, position: c.position ?? null,
        subject: lead.title, message: lead.description ?? null, value: lead.value, currency: lead.currency,
        // "status" uses the common new/contacted/qualified/won/lost vocabulary; the raw pipeline stage
        // travels as pipeline_stage so it never trips a receiver's status validation.
        status: statusFor(lead.stage), pipeline_stage: lead.stage,
        previous_status: statusFor(lead.previous_stage), previous_pipeline_stage: lead.previous_stage ?? null,
        source: lead.source ?? null,
        assigned_to: (lead.assigned_to as Json | null)?.name ?? null,
      };
    } else {
      payload = { event: d.event, sent_at: sentAt, delivery_id: d.id, lead };
    }

    // ---- Sign and send ----
    const bodyText = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const [full, plain] = await Promise.all([hmac(hook.secret, `${d.id}.${ts}.${bodyText}`), hmac(hook.secret, bodyText)]);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "CheckGrow-CRM-Webhooks/1.0",
      "x-webhook-id": d.id,
      "x-webhook-timestamp": ts,
      "x-webhook-signature": `v1,${full.b64}`,
      "x-signature": `sha256=${plain.hex}`,
      "x-webhook-event": d.event,
    };
    // Custom headers: only well-formed names (RFC 7230 tokens); anything else is ignored rather than failing the delivery
    for (const [k, v] of Object.entries(hook.headers || {})) {
      if (/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(k) && typeof v === "string" && !/[\r\n]/.test(v)) headers[k] = v;
    }

    let target: URL;
    try { target = new URL(hook.url); } catch { await fail("Invalid URL", null, null, payload); continue; }
    if (!/^https?:$/.test(target.protocol)) { await fail("URL must start with http:// or https://", null, null, payload); continue; }

    try {
      const res = await fetch(target.toString(), { method: "POST", headers, body: bodyText, signal: AbortSignal.timeout(10000), redirect: "manual" });
      const text = await res.text().catch(() => "");
      if (res.ok) {
        await admin.from("crm_outbound_deliveries").update({
          attempts: attempt, status: "delivered", delivered_at: new Date().toISOString(),
          last_status_code: res.status, last_error: null, response_body: text.slice(0, 1000), request_body: payload,
        }).eq("id", d.id);
        const { data: w } = await admin.from("crm_outbound_webhooks").select("delivered_count").eq("id", hook.id).maybeSingle();
        await admin.from("crm_outbound_webhooks").update({
          delivered_count: (w?.delivered_count ?? 0) + 1, last_delivered_at: new Date().toISOString(), last_status_code: res.status,
        }).eq("id", hook.id);
        results.push({ delivery: d.id, status: "delivered", code: res.status });
      } else {
        await fail(`HTTP ${res.status}`, res.status, text, payload);
      }
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "TimeoutError" ? "Timed out after 10s" : e.message) : String(e);
      await fail(msg, null, null, payload);
    }
  }

  return json({ processed: results.length, results });
});
