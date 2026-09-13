import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Inbound lead webhook.
 *
 * POST /functions/v1/crm-lead-webhook?token=<webhook token>
 *   (or header `x-webhook-token`, or the token as the last path segment)
 *
 * Accepts JSON, form-encoded, or multipart bodies. Common wrappers
 * (data / fields / answers / form_response / body / lead / payload) are unwrapped,
 * including event envelopes such as { event: "lead.created", lead: {...} }.
 * Recognised fields (case-insensitive, first match wins):
 *   name | full_name | contact | first_name + last_name
 *   email, phone | tel | mobile, company | organization | organisation
 *   position | title | role | job_title
 *   subject | deal | project | topic         -> lead title
 *   message | notes | description | details -> lead description
 *   value | amount | budget                  -> lead value (number)
 *   source | utm_source                      -> lead source (overrides webhook label)
 *   external_id | id | lead_id              -> de-duplication key
 *   campaign | form_name                     -> used in the lead title when there is no subject
 *
 * Header `x-skip-automations: 1` creates the lead without enrolling it in
 * automations (used by CSV imports of historical leads).
 * Everything else is appended to the description as "Details".
 *
 * Signature verification: when the webhook has a signing secret, every
 * delivery must prove it with HMAC-SHA256 over the raw body. Accepted forms:
 *   - header x-signature / x-webhook-signature / x-hub-signature-256 /
 *     x-signature-256 / x-checkgrow-signature / signature with the hex or
 *     base64 digest, optionally prefixed "sha256="
 *   - Stripe style "t=<ts>,v1=<hex>" (signs "<ts>.<body>")
 *   - Standard Webhooks "v1,<base64>" with webhook-id + webhook-timestamp
 *     (signs "<id>.<ts>.<body>")
 *   - the secret itself in x-webhook-secret or "Authorization: Bearer"
 *
 * After the lead is created, matching automations are enrolled and the
 * runner is woken so zero-delay steps execute immediately.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token, x-webhook-secret, x-skip-automations, x-signature, x-webhook-signature, x-hub-signature-256, x-signature-256, x-checkgrow-signature, webhook-signature, webhook-id, webhook-timestamp, x-timestamp, x-webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Payload = Record<string, unknown>;

interface Condition { field: string; op: string; value?: string }
interface Step { type: string; delay_minutes?: number }
interface Automation { id: string; trigger_type: string; webhook_id: string | null; conditions: Condition[]; steps: Step[] }

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
};

const norm = (k: string) => k.toLowerCase().replace(/[\s-]+/g, "_");

const pick = (payload: Payload, keys: string[]): { key: string; value: string } | null => {
  const lower = new Map(Object.keys(payload).map((k) => [norm(k), k]));
  for (const k of keys) {
    const real = lower.get(k);
    if (real !== undefined) {
      const v = str(payload[real]);
      if (v) return { key: real, value: v };
    }
  }
  return null;
};

const toNumber = (v: string | null): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const flatten = (obj: Payload, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const label = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) out[label] = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
    else if (typeof v === "object") Object.assign(out, flatten(v as Payload, label));
    else out[label] = String(v);
  }
  return out;
};

const conditionsMatch = (conditions: Condition[], fields: Record<string, string>): boolean => {
  const byKey = new Map(Object.entries(fields).map(([k, v]) => [norm(k), v]));
  for (const c of conditions || []) {
    if (!c?.field) continue;
    const actual = (byKey.get(norm(c.field)) ?? "").trim().toLowerCase();
    const expected = (c.value ?? "").trim().toLowerCase();
    switch (c.op) {
      case "equals": if (actual !== expected) return false; break;
      case "not_equals": if (actual === expected) return false; break;
      case "contains": if (!actual.includes(expected)) return false; break;
      case "not_contains": if (actual.includes(expected)) return false; break;
      case "exists": if (!actual) return false; break;
      case "not_exists": if (actual) return false; break;
      default: break;
    }
  }
  return true;
};

const SIG_HEADERS = ["x-checkgrow-signature", "x-webhook-signature", "x-signature-256", "x-hub-signature-256", "x-signature", "x-hmac-signature", "webhook-signature", "signature"];
const TS_HEADERS = ["x-checkgrow-timestamp", "x-webhook-timestamp", "webhook-timestamp", "x-signature-timestamp", "x-timestamp"];
const ID_HEADERS = ["webhook-id", "x-webhook-id"];

const hmac = async (secret: string, data: string): Promise<{ hex: string; b64: string }> => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return {
    hex: Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join(""),
    b64: btoa(String.fromCharCode(...sig)),
  };
};

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

interface SignatureCheck { ok: boolean; header?: string; reason?: string }

const verifySignature = async (req: Request, raw: string, secret: string): Promise<SignatureCheck> => {
  // Plain shared secret
  const plain = req.headers.get("x-webhook-secret") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (plain && safeEqual(plain, secret)) return { ok: true, header: "shared secret" };

  let header: string | undefined;
  let value: string | undefined;
  for (const h of SIG_HEADERS) {
    const v = req.headers.get(h);
    if (v) { header = h; value = v; break; }
  }
  if (!value) {
    const seen = Array.from(req.headers.keys()).filter((k) => /sign|secret|hmac|auth/i.test(k));
    return { ok: false, reason: seen.length ? `no signature header found (saw: ${seen.join(", ")})` : "no signature header found" };
  }

  let ts = TS_HEADERS.map((h) => req.headers.get(h)).find(Boolean) || null;
  const id = ID_HEADERS.map((h) => req.headers.get(h)).find(Boolean) || null;
  const provided: string[] = [];
  for (const part of value.split(/[\s,]+/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = eq > 0 ? part.slice(0, eq).toLowerCase() : "";
    if (eq > 0 && /^(t|ts|timestamp)$/.test(key)) { ts = ts || part.slice(eq + 1); continue; }
    if (eq > 0 && /^(v\d+|sha256|sha-256|hmac|hmac-sha256|s)$/.test(key)) { provided.push(part.slice(eq + 1)); continue; }
    if (/^v\d+$/.test(part)) continue; // "v1,<sig>" split into two tokens
    provided.push(part);
  }
  if (provided.length === 0) return { ok: false, header, reason: `could not read a digest from ${header}` };

  const contents = [raw];
  if (ts) contents.push(`${ts}.${raw}`);
  if (ts && id) contents.push(`${id}.${ts}.${raw}`);
  for (const content of contents) {
    const { hex, b64 } = await hmac(secret, content);
    for (const p of provided) {
      if (safeEqual(p.toLowerCase(), hex) || safeEqual(p, b64)) return { ok: true, header };
    }
  }
  return { ok: false, header, reason: `digest in ${header} does not match` };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") ||
    req.headers.get("x-webhook-token") ||
    url.pathname.split("/").filter(Boolean).pop();
  if (!token || token.length < 16 || token === "crm-lead-webhook") return json({ error: "Missing or invalid token" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: hook } = await supabase
    .from("crm_webhooks")
    .select("id, cluster_id, name, source_label, enabled, default_stage, default_assigned_to, created_by, signing_secret")
    .eq("token", token)
    .maybeSingle();
  if (!hook) return json({ error: "Unknown token" }, 401);
  if (!hook.enabled) return json({ error: "This webhook is disabled" }, 403);

  // ---- Read the raw body (needed for signature checks), then parse ----
  const raw = await req.text();
  let payload: Payload = {};
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      payload = JSON.parse(raw) as Payload;
    } else if (ctype.includes("multipart/form-data")) {
      const form = await new Response(raw, { headers: { "content-type": ctype } }).formData();
      for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : (v as File).name;
    } else if (ctype.includes("form")) {
      for (const [k, v] of new URLSearchParams(raw).entries()) payload[k] = v;
    } else {
      try { payload = JSON.parse(raw); } catch { payload = raw ? { message: raw } : {}; }
    }
  } catch {
    return json({ error: "Could not parse body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Body must be an object" }, 400);

  // ---- Signature check (only when the webhook has a signing secret) ----
  if (hook.signing_secret) {
    const check = await verifySignature(req, raw, hook.signing_secret);
    if (!check.ok) {
      await supabase.from("crm_webhook_events").insert({
        webhook_id: hook.id, cluster_id: hook.cluster_id,
        status: "rejected", error: `Signature check failed: ${check.reason}`, payload,
      });
      return json({
        error: "Invalid signature",
        detail: check.reason,
        hint: "Sign the raw body with HMAC-SHA256 using the webhook's signing secret and send it in x-signature (or send the secret in x-webhook-secret).",
      }, 401);
    }
  }

  // Unwrap common envelopes, e.g. Checkgrow's
  // { event: "lead.created", sent_at, delivery_id, lead: { id, name, email, ... } }
  const eventName = str(payload.event) || str(payload.event_type) || str(payload.type);
  const looksLikeLead = (o: Payload) => ["name", "email", "full_name", "first_name", "company", "phone"].some((k) => norm(k) in Object.fromEntries(Object.keys(o).map((x) => [norm(x), true])));
  for (const key of ["data", "fields", "answers", "form_response", "body", "lead", "payload", "contact", "submission"]) {
    const inner = payload[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner) && (Object.keys(payload).length <= 3 || eventName || looksLikeLead(inner as Payload))) {
      payload = inner as Payload;
      break;
    }
  }

  const used = new Set<string>();
  const take = (keys: string[]) => {
    const hit = pick(payload, keys);
    if (hit) used.add(hit.key);
    return hit?.value ?? null;
  };

  const externalId = take(["external_id", "lead_id", "id", "submission_id", "response_id"]);
  let name = take(["name", "full_name", "fullname", "contact", "contact_name", "lead", "lead_name"]);
  if (!name) {
    const first = take(["first_name", "firstname", "given_name"]);
    const last = take(["last_name", "lastname", "surname", "family_name"]);
    name = [first, last].filter(Boolean).join(" ") || null;
  }
  const email = take(["email", "email_address", "e_mail"])?.toLowerCase() ?? null;
  const phone = take(["phone", "tel", "telephone", "mobile", "phone_number"]);
  const company = take(["company", "organization", "organisation", "company_name", "business"]);
  const position = take(["position", "job_title", "title_role", "role"]);
  const subject = take(["subject", "deal", "deal_title", "project", "topic", "title", "lead_title"]);
  const message = take(["message", "notes", "description", "details", "comment", "comments", "inquiry"]);
  const value = toNumber(take(["value", "amount", "budget", "deal_value"]));
  const GENERIC_SOURCES = new Set(["webhook", "webhooks", "api", "form", "forms", "manual", "import", "other", "unknown", "inbound"]);
  const rawSource = take(["source", "utm_source", "lead_source", "channel"]);
  const source = (rawSource && !GENERIC_SOURCES.has(rawSource.toLowerCase()) ? rawSource : null) || hook.source_label || hook.name;

  if (!name && !email && !company && !subject) {
    await supabase.from("crm_webhook_events").insert({
      webhook_id: hook.id, cluster_id: hook.cluster_id, external_id: externalId,
      status: "error", error: "No name, email, company, or subject in payload", payload,
    });
    return json({ error: "Payload needs at least a name, email, company, or subject" }, 422);
  }

  // ---- De-duplicate on external id ----
  if (externalId) {
    const { data: existing } = await supabase
      .from("crm_webhook_events")
      .select("id, deal_id, contact_id")
      .eq("webhook_id", hook.id)
      .eq("external_id", externalId)
      .maybeSingle();
    if (existing) {
      if (existing.contact_id && (phone || company || position || name)) {
        const patch: Record<string, unknown> = {};
        if (phone) patch.phone = phone;
        if (company) patch.company = company;
        if (position) patch.position = position;
        if (name) patch.name = name;
        await supabase.from("crm_contacts").update(patch).eq("id", existing.contact_id);
      }
      return json({ ok: true, duplicate: true, event: eventName, deal_id: existing.deal_id, contact_id: existing.contact_id });
    }
  }

  // ---- Contact: reuse by email inside the organization ----
  let contactId: string | null = null;
  if (email) {
    const { data: found } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("cluster_id", hook.cluster_id)
      .ilike("email", email)
      .maybeSingle();
    contactId = found?.id ?? null;
    if (contactId) {
      const patch: Record<string, unknown> = { last_contacted_at: new Date().toISOString() };
      if (phone) patch.phone = phone;
      if (company) patch.company = company;
      if (position) patch.position = position;
      await supabase.from("crm_contacts").update(patch).eq("id", contactId);
    }
  }
  const creatorId = hook.created_by;
  if (!creatorId) {
    return json({ error: "Webhook has no owner; recreate it from the CRM" }, 500);
  }
  if (!contactId && (name || email || company)) {
    const { data: created, error: contactError } = await supabase
      .from("crm_contacts")
      .insert({
        cluster_id: hook.cluster_id,
        name: name || company || email!,
        email,
        phone,
        company,
        position,
        contact_type: "lead",
        lead_status: "new",
        source,
        created_by: creatorId,
        assigned_to: hook.default_assigned_to,
        last_contacted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (contactError) {
      await supabase.from("crm_webhook_events").insert({
        webhook_id: hook.id, cluster_id: hook.cluster_id, external_id: externalId,
        status: "error", error: `contact: ${contactError.message}`, payload,
      });
      return json({ error: contactError.message }, 500);
    }
    contactId = created.id;
  }

  // ---- Deal ----
  const flat = flatten(payload);
  const extras = Object.entries(flat)
    .filter(([k]) => !used.has(k.split(".")[0]))
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const descriptionParts = [message, extras ? `Details\n${extras}` : null].filter(Boolean);
  const campaign = pick(payload, ["campaign", "campaign_name", "form", "form_name"])?.value ?? null;
  const title = subject || [company || name || email, campaign || "new lead"].filter(Boolean).join(" · ");

  const { data: deal, error: dealError } = await supabase
    .from("crm_deals")
    .insert({
      cluster_id: hook.cluster_id,
      contact_id: contactId,
      title: title.slice(0, 200),
      description: descriptionParts.join("\n\n") || null,
      value,
      currency: "EUR",
      stage: hook.default_stage,
      probability: 20,
      approval_status: "approved",
      source,
      created_by: creatorId,
      assigned_to: hook.default_assigned_to,
    })
    .select("id")
    .single();

  if (dealError) {
    await supabase.from("crm_webhook_events").insert({
      webhook_id: hook.id, cluster_id: hook.cluster_id, external_id: externalId,
      status: "error", error: `deal: ${dealError.message}`, payload, contact_id: contactId,
    });
    return json({ error: dealError.message }, 500);
  }

  const { data: event } = await supabase
    .from("crm_webhook_events")
    .insert({
      webhook_id: hook.id, cluster_id: hook.cluster_id, external_id: externalId,
      status: "created", payload, deal_id: deal.id, contact_id: contactId,
    })
    .select("id")
    .single();

  await Promise.all([
    supabase.rpc("bump_webhook_counter", { _webhook_id: hook.id }),
    hook.default_assigned_to && hook.default_assigned_to !== creatorId
      ? supabase.from("notifications").insert({
          cluster_id: hook.cluster_id,
          recipient_id: hook.default_assigned_to,
          sender_id: creatorId,
          notification_type: "deal_assigned",
          title: `New lead from ${source}`,
          content: title,
          link_type: "deal",
          link_id: deal.id,
        })
      : Promise.resolve(),
  ]);

  // ---- Automations: enrol the lead in every matching sequence ----
  const enrolled: string[] = [];
  let dueNow = false;
  const skipAutomations = /^(1|true|yes)$/i.test(req.headers.get("x-skip-automations") || "");
  const { data: automations } = skipAutomations ? { data: [] } : await supabase
    .from("crm_automations")
    .select("id, trigger_type, webhook_id, conditions, steps")
    .eq("cluster_id", hook.cluster_id)
    .eq("enabled", true);
  const { data: cluster } = await supabase.from("clusters").select("name").eq("id", hook.cluster_id).maybeSingle();
  const leadFields: Record<string, string> = {
    ...flat,
    name: name ?? "", email: email ?? "", company: company ?? "", phone: phone ?? "",
    source, lead_title: title, subject: subject ?? "", message: message ?? "",
  };
  for (const a of (automations || []) as Automation[]) {
    const triggerOk = a.trigger_type === "any_inbound" || (a.trigger_type === "webhook" && a.webhook_id === hook.id);
    if (!triggerOk || !conditionsMatch(a.conditions || [], leadFields)) continue;
    const steps = Array.isArray(a.steps) ? a.steps : [];
    const firstDelay = Math.max(0, Number(steps[0]?.delay_minutes) || 0);
    const context = {
      name: name ?? "", first_name: (name ?? "").split(" ")[0] ?? "", email: email ?? "", company: company ?? "",
      phone: phone ?? "", source, lead_title: title, org_name: cluster?.name ?? "", payload: flat,
    };
    const { error } = await supabase.from("crm_automation_runs").insert({
      automation_id: a.id, cluster_id: hook.cluster_id, deal_id: deal.id, contact_id: contactId,
      webhook_event_id: event?.id ?? null,
      status: steps.length === 0 ? "completed" : "running",
      completed_at: steps.length === 0 ? new Date().toISOString() : null,
      current_step: 0,
      next_run_at: steps.length === 0 ? null : new Date(Date.now() + firstDelay * 60000).toISOString(),
      context,
    });
    if (!error) {
      enrolled.push(a.id);
      if (steps.length > 0 && firstDelay === 0) dueNow = true;
      await supabase.rpc("bump_automation_counter", { _automation_id: a.id });
    }
  }

  // Wake the runner so zero-delay steps go out right away
  if (dueNow) {
    const { data: cfg } = await supabase.from("automation_runner_config").select("secret, runner_url").eq("id", 1).maybeSingle();
    if (cfg) {
      const wake = fetch(cfg.runner_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-runner-secret": cfg.secret },
        body: JSON.stringify({ source: "webhook", cluster_id: hook.cluster_id }),
      }).catch(() => {});
      const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(wake); else await wake;
    }
  }

  return json({ ok: true, deal_id: deal.id, contact_id: contactId, source, automations: enrolled });
});
