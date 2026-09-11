import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (s: string) => {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || `col_${Math.random().toString(36).slice(2, 7)}`;
};

const flatten = (obj: Record<string, unknown>, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const label = prefix ? `${prefix} ${k}` : k;
    if (v === null || v === undefined) out[label] = "";
    else if (Array.isArray(v)) out[label] = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
    else if (typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, label));
    else out[label] = String(v);
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") ||
    req.headers.get("x-registry-token") ||
    url.pathname.split("/").filter(Boolean).pop();

  if (!token || token.length < 16) return json({ error: "Missing or invalid token" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: registry } = await supabase
    .from("org_registries")
    .select("id, webhook_enabled")
    .eq("webhook_token", token)
    .maybeSingle();

  if (!registry) return json({ error: "Unknown token" }, 401);
  if (!registry.webhook_enabled) return json({ error: "Webhook disabled for this registry" }, 403);

  // ---- Parse payload (JSON, form-encoded, or multipart) ----
  let payload: Record<string, unknown> = {};
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      payload = await req.json();
    } else if (ctype.includes("form")) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : (v as File).name;
    } else {
      const text = await req.text();
      try { payload = JSON.parse(text); } catch { payload = { payload: text }; }
    }
  } catch {
    return json({ error: "Could not parse body" }, 400);
  }

  // Common wrappers (Framer / Typeform / Tally style)
  for (const key of ["data", "fields", "answers", "form_response", "body"]) {
    const inner = (payload as Record<string, unknown>)[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner) && Object.keys(payload).length <= 3) {
      payload = inner as Record<string, unknown>;
      break;
    }
  }

  const flat = flatten(payload as Record<string, unknown>);
  if (Object.keys(flat).length === 0) return json({ error: "Empty payload" }, 400);

  // ---- Match / create columns ----
  const { data: existingCols } = await supabase
    .from("org_registry_columns")
    .select("id, key, name, position")
    .eq("registry_id", registry.id)
    .order("position", { ascending: true });

  const cols = existingCols || [];
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const byName = new Map(cols.map((c) => [c.name.toLowerCase().trim(), c]));
  let nextPos = cols.length;
  const rowData: Record<string, unknown> = {};
  const created: string[] = [];

  for (const [label, value] of Object.entries(flat)) {
    const slug = slugify(label);
    const match = byKey.get(slug) || byName.get(label.toLowerCase().trim());
    if (match) {
      rowData[match.key] = value;
      continue;
    }
    const { data: newCol, error } = await supabase
      .from("org_registry_columns")
      .insert({ registry_id: registry.id, key: slug, name: label, type: "text", position: nextPos++ })
      .select()
      .single();
    if (error || !newCol) continue;
    byKey.set(newCol.key, newCol);
    byName.set(newCol.name.toLowerCase().trim(), newCol);
    created.push(newCol.name);
    rowData[newCol.key] = value;
  }

  const { count } = await supabase
    .from("org_registry_rows")
    .select("id", { count: "exact", head: true })
    .eq("registry_id", registry.id);

  const { error: rowErr } = await supabase
    .from("org_registry_rows")
    .insert({ registry_id: registry.id, data: rowData, position: count || 0 });

  if (rowErr) return json({ error: rowErr.message }, 500);

  await supabase
    .from("org_registries")
    .update({ webhook_last_received_at: new Date().toISOString() })
    .eq("id", registry.id);

  return json({ ok: true, fields: Object.keys(rowData).length, created_columns: created });
});
