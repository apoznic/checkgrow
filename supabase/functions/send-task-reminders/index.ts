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
  project_id: string;
  assigned_to: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { clusterId, mode } = await req.json(); // mode: 'preview' | 'send'
    if (!clusterId) {
      return new Response(JSON.stringify({ error: "clusterId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get projects in this cluster
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title")
      .eq("cluster_id", clusterId);

    const projectMap = new Map<string, string>(
      (projects || []).map((p: any) => [p.id, p.title]),
    );
    const projectIds = Array.from(projectMap.keys());

    if (projectIds.length === 0) {
      return new Response(JSON.stringify({ recipients: [], sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending tasks
    const { data: tasks } = await supabase
      .from("project_tasks")
      .select("id, title, status, priority, due_date, project_id, assigned_to")
      .in("project_id", projectIds)
      .not("assigned_to", "is", null)
      .neq("status", "done")
      .is("archived_at", null);

    // Group by assignee
    const byAssignee = new Map<string, TaskRow[]>();
    for (const t of (tasks || []) as TaskRow[]) {
      if (!byAssignee.has(t.assigned_to)) byAssignee.set(t.assigned_to, []);
      byAssignee.get(t.assigned_to)!.push(t);
    }

    const assigneeIds = Array.from(byAssignee.keys());
    if (assigneeIds.length === 0) {
      return new Response(JSON.stringify({ recipients: [], sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve profiles -> user_id, name, email
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, user_id")
      .in("id", assigneeIds);

    const userIdByProfile = new Map<string, { user_id: string; full_name: string | null }>();
    for (const p of profiles || []) {
      userIdByProfile.set(p.id, { user_id: p.user_id, full_name: p.full_name });
    }

    const emailLookups = await Promise.all(
      Array.from(userIdByProfile.values()).map((v) =>
        supabase.auth.admin.getUserById(v.user_id),
      ),
    );
    const emailByUserId = new Map<string, string>();
    for (const r of emailLookups) {
      const u = r.data?.user;
      if (u?.email) emailByUserId.set(u.id, u.email);
    }

    const recipients = assigneeIds
      .map((profileId) => {
        const info = userIdByProfile.get(profileId);
        if (!info) return null;
        const email = emailByUserId.get(info.user_id);
        if (!email) return null;
        const tasks = byAssignee.get(profileId) || [];
        return {
          profileId,
          name: info.full_name || "there",
          email,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            due_date: t.due_date,
            project_id: t.project_id,
            project_name: projectMap.get(t.project_id) || "Unknown project",
          })),
        };
      })
      .filter(Boolean) as any[];

    if (mode === "preview") {
      return new Response(JSON.stringify({ recipients }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send mode
    const { key: resendApiKey, config: emailConfig } = await getIntegrationKey(clusterId, "resend");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured. Add a Resend API key in Integrations." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const senderDomain = (emailConfig.sender_domain as string) || "notify.checkgrow.com";
    const senderName = (emailConfig.sender_name as string) || "CheckGrow";
    const fromAddress = `${senderName} <notify@${senderDomain}>`;

    // Get cluster name
    const { data: cluster } = await supabase
      .from("clusters")
      .select("name")
      .eq("id", clusterId)
      .single();
    const clusterName = cluster?.name || "your organization";

    let sent = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      // Group tasks by project for the email
      const byProject = new Map<string, typeof r.tasks>();
      for (const t of r.tasks) {
        if (!byProject.has(t.project_name)) byProject.set(t.project_name, []);
        byProject.get(t.project_name)!.push(t);
      }

      const projectSections = Array.from(byProject.entries())
        .map(([projectName, ts]) => {
          const rows = ts
            .map((t: any) => {
              const due = t.due_date
                ? `<span style="color:#888;font-size:12px;"> · due ${new Date(t.due_date).toLocaleDateString()}</span>`
                : "";
              const prio = t.priority && t.priority !== "medium"
                ? `<span style="background:#f3f3f3;color:#666;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px;">${t.priority}</span>`
                : "";
              return `<li style="margin:6px 0;color:#333;">${t.title}${prio}${due}</li>`;
            })
            .join("");
          return `
            <div style="margin:20px 0;">
              <h3 style="font-size:14px;color:#1a1612;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">${projectName}</h3>
              <ul style="padding-left:20px;margin:0;">${rows}</ul>
            </div>`;
        })
        .join("");

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1612;">
          <h1 style="font-size:22px;margin:0 0 8px;">Hi ${r.name},</h1>
          <p style="color:#555;margin:0 0 24px;">Here's a snapshot of your open tasks across ${clusterName}.</p>
          <div style="background:#fafaf8;border:1px solid #eee;border-radius:12px;padding:20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#888;">${r.tasks.length} open task${r.tasks.length === 1 ? "" : "s"}</p>
            ${projectSections}
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px;">Sent from ${clusterName} · CheckGrow</p>
        </div>`;

      // Retry up to 3 times, handling Resend's 2 req/sec rate limit (429)
      let attempt = 0;
      let success = false;
      let lastError = "";
      while (attempt < 3 && !success) {
        attempt++;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
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
          const retryAfter = Number(res.headers.get("retry-after")) || 1;
          lastError = `429 rate limited (attempt ${attempt})`;
          await new Promise((r) => setTimeout(r, retryAfter * 1000 + 200));
        } else {
          const txt = await res.text();
          lastError = `${res.status}: ${txt.slice(0, 200)}`;
          break;
        }
      }
      if (!success) errors.push(`${r.email}: ${lastError}`);

      // Throttle to stay under Resend's 2 req/sec limit
      await new Promise((r) => setTimeout(r, 600));
    }

    return new Response(
      JSON.stringify({ sent, total: recipients.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
