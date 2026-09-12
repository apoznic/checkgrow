import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  created_by: string;
  deal_id: string | null;
  crm_deals: { id: string; title: string } | null;
}

interface RecipientTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  group: string;
}

interface Recipient {
  profileId: string;
  name: string;
  email: string;
  tasks: RecipientTask[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

/**
 * Emails every member of an organization a digest of the open tasks assigned to
 * them on the Members board (crm_tasks). mode: 'preview' returns the recipients
 * without sending; 'send' delivers through the organization's Resend key.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { clusterId, mode } = await req.json(); // mode: 'preview' | 'send'
    if (!clusterId) return json({ error: "clusterId required" }, 400);

    // Only organization owners and admins may preview or send digests.
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const { data: isManager } = await userClient.rpc("has_org_role", {
      _user_id: userData.user.id,
      _cluster_id: clusterId,
      _roles: ["owner", "admin"],
    });
    if (!isManager) return json({ error: "Only organization owners and admins can send reminders" }, 403);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: tasks, error: tasksError } = await supabase
      .from("crm_tasks")
      .select("id, title, status, priority, due_date, assigned_to, created_by, deal_id, crm_deals ( id, title )")
      .eq("cluster_id", clusterId)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false });
    if (tasksError) return json({ error: tasksError.message }, 500);

    const byAssignee = new Map<string, TaskRow[]>();
    for (const t of (tasks || []) as unknown as TaskRow[]) {
      if (!byAssignee.has(t.assigned_to)) byAssignee.set(t.assigned_to, []);
      byAssignee.get(t.assigned_to)!.push(t);
    }

    const assigneeIds = Array.from(byAssignee.keys());
    if (assigneeIds.length === 0) return json({ recipients: [], sent: 0, total: 0 });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, user_id")
      .in("id", assigneeIds);

    const infoByProfile = new Map<string, { user_id: string; full_name: string | null }>();
    for (const p of profiles || []) infoByProfile.set(p.id, { user_id: p.user_id, full_name: p.full_name });

    const emailLookups = await Promise.all(
      Array.from(infoByProfile.values()).map((v) => supabase.auth.admin.getUserById(v.user_id)),
    );
    const emailByUserId = new Map<string, string>();
    for (const r of emailLookups) {
      const u = r.data?.user;
      if (u?.email) emailByUserId.set(u.id, u.email);
    }

    const recipients: Recipient[] = [];
    for (const profileId of assigneeIds) {
      const info = infoByProfile.get(profileId);
      if (!info) continue;
      const email = emailByUserId.get(info.user_id);
      if (!email) continue;
      recipients.push({
        profileId,
        name: info.full_name || "there",
        email,
        tasks: (byAssignee.get(profileId) || []).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          group: t.crm_deals?.title ? `Lead: ${t.crm_deals.title}` : "General tasks",
        })),
      });
    }

    if (mode === "preview") return json({ recipients });

    const { key: resendApiKey, config: emailConfig } = await getIntegrationKey(clusterId, "resend");
    if (!resendApiKey) {
      return json({ error: "Email service not configured. Add a Resend API key in Integrations." }, 400);
    }

    const senderDomain = (emailConfig?.sender_domain as string) || "notify.checkgrow.com";
    const senderName = (emailConfig?.sender_name as string) || "CheckGrow";
    const fromAddress = `${senderName} <notify@${senderDomain}>`;

    const { data: cluster } = await supabase.from("clusters").select("name").eq("id", clusterId).single();
    const clusterName = cluster?.name || "your organization";

    let sent = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      const byGroup = new Map<string, RecipientTask[]>();
      for (const t of r.tasks) {
        if (!byGroup.has(t.group)) byGroup.set(t.group, []);
        byGroup.get(t.group)!.push(t);
      }

      const sections = Array.from(byGroup.entries())
        .map(([group, ts]) => {
          const rows = ts
            .map((t) => {
              const due = t.due_date
                ? `<span style="color:#888;font-size:12px;"> · due ${new Date(t.due_date).toLocaleDateString("en-GB")}</span>`
                : "";
              const prio = t.priority && t.priority !== "medium"
                ? `<span style="background:#f3f3f3;color:#666;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px;">${escapeHtml(t.priority)}</span>`
                : "";
              const state = t.status === "in_progress"
                ? `<span style="color:#b45309;font-size:11px;margin-left:6px;">in progress</span>`
                : "";
              return `<li style="margin:6px 0;color:#333;">${escapeHtml(t.title)}${state}${prio}${due}</li>`;
            })
            .join("");
          return `
            <div style="margin:20px 0;">
              <h3 style="font-size:14px;color:#1a1612;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(group)}</h3>
              <ul style="padding-left:20px;margin:0;">${rows}</ul>
            </div>`;
        })
        .join("");

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1612;">
          <h1 style="font-size:22px;margin:0 0 8px;">Hi ${escapeHtml(r.name)},</h1>
          <p style="color:#555;margin:0 0 24px;">Here's a snapshot of your open tasks in ${escapeHtml(clusterName)}.</p>
          <div style="background:#fafaf8;border:1px solid #eee;border-radius:12px;padding:20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#888;">${r.tasks.length} open task${r.tasks.length === 1 ? "" : "s"}</p>
            ${sections}
          </div>
          <p style="margin:24px 0 0;"><a href="https://ai.checkgrow.com/admin" style="display:inline-block;background:#1a1612;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">Open CheckGrow</a></p>
          <p style="color:#888;font-size:12px;margin-top:24px;">Sent from ${escapeHtml(clusterName)} · CheckGrow</p>
        </div>`;

      // Retry up to 3 times, respecting Resend's rate limit (429)
      let attempt = 0;
      let success = false;
      let lastError = "";
      while (attempt < 3 && !success) {
        attempt++;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromAddress,
            to: [r.email],
            subject: `📋 Your open tasks in ${clusterName} (${r.tasks.length})`,
            html,
          }),
        });
        if (res.ok) {
          success = true;
          sent++;
        } else if (res.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        } else {
          lastError = await res.text();
          break;
        }
      }
      if (!success) errors.push(`${r.email}: ${lastError || "rate limited"}`);
      // Stay under Resend's 2 requests/second limit
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    return json({ sent, total: recipients.length, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
