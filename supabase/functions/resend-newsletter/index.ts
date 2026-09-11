import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";
import { renderTemplate } from "../_shared/newsletter-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND = "https://api.resend.com";

async function rfetch(key: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${RESEND}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* */ }
  if (!res.ok) {
    throw new Error(json?.message || json?.error?.message || `Resend ${res.status}: ${text}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, clusterId } = body;
    if (!clusterId || !action) {
      return new Response(JSON.stringify({ error: "clusterId and action required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify owner
    const { data: isOwner } = await userClient.rpc("has_org_role", {
      _user_id: user.id, _cluster_id: clusterId, _roles: ["owner"],
    });
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Only organization owner can manage newsletter" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get Resend key
    const { key: resendKey, config } = await getIntegrationKey(clusterId, "resend");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "No Resend API key configured for this organization. Add it in Integrations." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const senderDomain = (config.sender_domain as string) || "notify.checkgrow.com";

    const admin = createClient(supabaseUrl, serviceKey);

    // Always derive sender name from current cluster name so renames are reflected.
    const { data: clusterRow } = await admin
      .from("clusters")
      .select("name")
      .eq("id", clusterId)
      .maybeSingle();
    const senderName = (clusterRow?.name as string) || (config.sender_name as string) || "CheckGrow";

    // ---- LIST AUDIENCES ----
    if (action === "list_audiences") {
      const data = await rfetch(resendKey, "/audiences");
      return new Response(JSON.stringify({ audiences: data?.data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- CREATE AUDIENCE ----
    if (action === "create_audience") {
      const { name } = body;
      if (!name) return new Response(JSON.stringify({ error: "name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await rfetch(resendKey, "/audiences", { method: "POST", body: JSON.stringify({ name }) });
      return new Response(JSON.stringify({ audience: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- SYNC: pull contacts from Resend audience into local table ----
    if (action === "sync_contacts") {
      const { audienceId } = body;
      if (!audienceId) return new Response(JSON.stringify({ error: "audienceId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await rfetch(resendKey, `/audiences/${audienceId}/contacts`);
      const remote = data?.data || [];
      let synced = 0;
      for (const c of remote) {
        const email = (c.email || "").toLowerCase().trim();
        if (!email) continue;
        const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
        await admin.from("newsletter_contacts").upsert({
          cluster_id: clusterId,
          audience_id: audienceId,
          email,
          full_name: fullName,
          resend_contact_id: c.id,
          unsubscribed: !!c.unsubscribed,
        }, { onConflict: "cluster_id,audience_id,email" });
        synced++;
      }
      return new Response(JSON.stringify({ synced }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- ADD CONTACT (and push to Resend audience) ----
    if (action === "add_contact") {
      const { audienceId, email, fullName, groupIds } = body;
      if (!audienceId || !email) {
        return new Response(JSON.stringify({ error: "audienceId and email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const [firstName, ...rest] = (fullName || "").split(" ");
      const lastName = rest.join(" ") || undefined;

      let resendContactId: string | null = null;
      try {
        const created = await rfetch(resendKey, `/audiences/${audienceId}/contacts`, {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail, first_name: firstName || undefined, last_name: lastName, unsubscribed: false }),
        });
        resendContactId = created?.id || null;
      } catch (e) {
        // Likely already exists - try to fetch
        console.log("Add contact error (may exist):", (e as Error).message);
      }

      const { data: row, error } = await admin.from("newsletter_contacts").upsert({
        cluster_id: clusterId,
        audience_id: audienceId,
        email: cleanEmail,
        full_name: fullName || null,
        resend_contact_id: resendContactId,
        group_ids: groupIds || [],
      }, { onConflict: "cluster_id,audience_id,email" }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ contact: row }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- BULK ADD CONTACTS ----
    if (action === "bulk_add_contacts") {
      const { audienceId, contacts, groupIds } = body as {
        audienceId: string;
        contacts: { email: string; fullName?: string }[];
        groupIds?: string[];
      };
      if (!audienceId || !Array.isArray(contacts) || contacts.length === 0) {
        return new Response(JSON.stringify({ error: "audienceId and contacts[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Dedupe by email
      const seen = new Set<string>();
      const clean = contacts
        .map((c) => ({ email: String(c.email || "").toLowerCase().trim(), fullName: (c.fullName || "").trim() }))
        .filter((c) => c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
        .filter((c) => (seen.has(c.email) ? false : (seen.add(c.email), true)));

      let added = 0, failed = 0;
      const errors: { email: string; error: string }[] = [];

      // Throttle: Resend allows ~2 req/sec on free tier; batch of 5 with a small delay
      const CONCURRENCY = 5;
      for (let i = 0; i < clean.length; i += CONCURRENCY) {
        const slice = clean.slice(i, i + CONCURRENCY);
        await Promise.all(slice.map(async (c) => {
          const [firstName, ...rest] = c.fullName.split(" ");
          const lastName = rest.join(" ") || undefined;
          let resendContactId: string | null = null;
          try {
            const created = await rfetch(resendKey, `/audiences/${audienceId}/contacts`, {
              method: "POST",
              body: JSON.stringify({
                email: c.email,
                first_name: firstName || undefined,
                last_name: lastName,
                unsubscribed: false,
              }),
            });
            resendContactId = created?.id || null;
          } catch (e) {
            // Ignore "already exists" - we still upsert locally
            const msg = (e as Error).message;
            if (!/already|exists|duplicate/i.test(msg)) {
              console.log("Bulk add resend err:", c.email, msg);
            }
          }
          const { error } = await admin.from("newsletter_contacts").upsert({
            cluster_id: clusterId,
            audience_id: audienceId,
            email: c.email,
            full_name: c.fullName || null,
            resend_contact_id: resendContactId,
            group_ids: groupIds || [],
          }, { onConflict: "cluster_id,audience_id,email" });
          if (error) { failed++; errors.push({ email: c.email, error: error.message }); }
          else { added++; }
        }));
        // Small throttle between batches
        await new Promise((r) => setTimeout(r, 250));
      }

      return new Response(JSON.stringify({ added, failed, total: clean.length, skipped: contacts.length - clean.length, errors: errors.slice(0, 10) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- REMOVE CONTACT ----
    if (action === "remove_contact") {
      const { audienceId, contactId, email, resendContactId } = body;
      if (audienceId && (resendContactId || email)) {
        try {
          await rfetch(resendKey, `/audiences/${audienceId}/contacts/${resendContactId || email}`, { method: "DELETE" });
        } catch (e) { console.log("Resend delete err:", (e as Error).message); }
      }
      if (contactId) {
        await admin.from("newsletter_contacts").delete().eq("id", contactId).eq("cluster_id", clusterId);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- SEND CAMPAIGN ----
    if (action === "send_campaign") {
      const { subject, content, groupId, audienceId, templateId, sendMode } = body;
      if (!subject || !content || !audienceId) {
        return new Response(JSON.stringify({ error: "subject, content and audienceId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let query = admin.from("newsletter_contacts")
        .select("email, full_name, group_ids")
        .eq("cluster_id", clusterId)
        .eq("audience_id", audienceId)
        .eq("unsubscribed", false);
      if (groupId) query = query.contains("group_ids", [groupId]);
      const { data: recipients, error: cErr } = await query;
      if (cErr) throw cErr;

      if (!recipients || recipients.length === 0) {
        return new Response(JSON.stringify({ error: "No recipients in this mailing list" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const html = renderTemplate(templateId || 'minimal', { subject, content, senderName });
      const fromAddr = `${senderName} <newsletter@${senderDomain}>`;
      const allEmails = recipients.map((r: any) => r.email);

      let sent = 0; let failed = 0;

      if (sendMode === "bcc") {
        // Resend: max 50 recipients TOTAL per send (to+cc+bcc), and 2 req/sec on free tier.
        // We use to:[fromAddr] (1) + bcc up to 49.
        const BCC_BATCH = 49;
        for (let i = 0; i < allEmails.length; i += BCC_BATCH) {
          const bcc = allEmails.slice(i, i + BCC_BATCH);
          try {
            await rfetch(resendKey, "/emails", {
              method: "POST",
              body: JSON.stringify({ from: fromAddr, to: [fromAddr], bcc, subject, html }),
            });
            sent += bcc.length;
          } catch (e) {
            const msg = (e as Error).message;
            console.error("BCC send err:", msg);
            failed += bcc.length;
            // If rate-limited, back off a bit longer
            if (/rate|429|too many/i.test(msg)) await new Promise((r) => setTimeout(r, 1500));
          }
          // Throttle: paid Resend tier allows 10 req/sec → ~120ms between sends
          await new Promise((r) => setTimeout(r, 120));
        }
      } else {
        const BATCH = 90;
        for (let i = 0; i < recipients.length; i += BATCH) {
          const slice = recipients.slice(i, i + BATCH).map((r: any) => ({
            from: fromAddr,
            to: [r.email],
            subject,
            html,
          }));
          try {
            await rfetch(resendKey, "/emails/batch", { method: "POST", body: JSON.stringify(slice) });
            sent += slice.length;
          } catch (e) {
            console.error("Batch send err:", (e as Error).message);
            failed += slice.length;
          }
        }
      }

      const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).single();
      await admin.from("newsletter_campaigns").insert({
        cluster_id: clusterId,
        audience_id: audienceId,
        subject, content,
        group_id: groupId || null,
        recipients_count: sent,
        sent_by: profile?.id || null,
      });

      return new Response(JSON.stringify({ sent, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("resend-newsletter error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
