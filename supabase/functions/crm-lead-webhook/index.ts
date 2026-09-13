import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Inbound lead webhook.
 *
 * POST /functions/v1/crm-lead-webhook?token=<webhook token>
 *   (or header `x-webhook-token`, or the token as the last path segment)
 *
 * Accepts JSON, form-encoded, or multipart bodies. Common wrappers
 * (data / fields / answers / form_response / body / lead) are unwrapped.
 * Recognised fields (case-insensitive, first match wins):
 *   name | full_name | contact | first_name + last_name
 *   email, phone | tel | mobile, company | organization | organisation
 *   position | title | role | job_title
 *   subject | deal | project | topic         -> lead title
 *   message | notes | description | details -> lead description
 *   value | amount | budget                  -> lead value (number)
 *   source | utm_source                      -> lead source (overrides webhook label)
 *   external_id | id | lead_id              -> de-duplication key
 * Everything else is appended to the description as "Details".
 *
 * After the lead is created, matching automations are enrolled and the
 * runner is woken so zero-delay steps execute immediately.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
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
    .select("id, cluster_id, name, source_label, enabled, default_stage, default_assigned_to, created_by")
    .eq("token", token)
    .maybeSingle();
  if (!hook) return json({ error: "Unknown token" }, 401);
  if (!hook.enabled) return json({ error: "This webhook is disabled" }, 403);

  // ---- Parse body ----
  let payload: Payload = {};
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      payload = (await req.json()) as Payload;
    } else if (ctype.includes("form")) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : (v as File).name;
    } else {
      const text = await req.text();
      try { payload = JSON.parse(text); } catch { payload = text ? { message: text } : {}; }
    }
  } catch {
    return json({ error: "Could not parse body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Body must be an object" }, 400);

  // Unwrap common envelopes
  for (const key of ["data", "fields", "answers", "form_response", "body", "lead", "payload"]) {
    const inner = payload[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner) && Object.keys(payload).length <= 3) {
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
  let name = take(["name", "full_name", "fullname", "contact", "contact_name"]);
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
  const source = take(["source", "utm_source", "lead_source", "channel"]) || hook.source_label || hook.name;

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
      return json({ ok: true, duplicate: true, deal_id: existing.deal_id, contact_id: existing.contact_id });
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
  const title = subject || [company || name || email, "new lead"].filter(Boolean).join(" · ");

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
  const { data: automations } = await supabase
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
