import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

/**
 * Automation runner. Executes due steps of running automation runs.
 *
 * Called by:
 *  - the database scheduler every 5 minutes (header `x-runner-secret`)
 *  - the crm-lead-webhook function right after enrolling a lead (same header)
 *  - the app, with a user JWT, to process due runs of one organization now
 *    (body: { cluster_id }) — the user must be an owner or admin there.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-runner-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Json = Record<string, unknown>;

interface Step {
  id?: string;
  type: "email" | "task" | "assign" | "stage" | "notify" | "wait";
  delay_minutes?: number;
  subject?: string;
  body?: string;
  title?: string;
  message?: string;
  description?: string;
  assignee_id?: string | null;
  profile_id?: string | null;
  due_in_days?: number;
  priority?: string;
  stage?: string;
}

interface Run {
  id: string;
  automation_id: string;
  cluster_id: string;
  deal_id: string | null;
  contact_id: string | null;
  current_step: number;
  context: Json;
  log: Json[];
  crm_automations: { id: string; name: string; enabled: boolean; steps: Step[]; created_by: string | null } | null;
  crm_deals: { id: string; title: string; assigned_to: string | null; stage: string } | null;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

const lookup = (ctx: Json, path: string): string => {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return "";
    const obj = cur as Json;
    const key = Object.keys(obj).find((k) => k.toLowerCase().replace(/[\s-]+/g, "_") === p.toLowerCase().replace(/[\s-]+/g, "_"));
    cur = key === undefined ? undefined : obj[key];
  }
  if (cur === null || cur === undefined) return "";
  return typeof cur === "object" ? JSON.stringify(cur) : String(cur);
};

const render = (template: string | undefined, ctx: Json): string =>
  (template || "").replace(/\{\{\s*([\w.\-]+)\s*\}\}/g, (_, key) => lookup(ctx, key));

const textToHtml = (text: string) =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let body: Json = {};
  try { body = await req.json(); } catch { body = {}; }

  // ---- Authentication: scheduler secret or an org manager's JWT ----
  let clusterFilter: string | null = null;
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
    clusterFilter = clusterId;
  }

  // ---- Fetch due runs ----
  let query = admin
    .from("crm_automation_runs")
    .select("id, automation_id, cluster_id, deal_id, contact_id, current_step, context, log, crm_automations ( id, name, enabled, steps, created_by ), crm_deals ( id, title, assigned_to, stage )")
    .eq("status", "running")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(50);
  if (clusterFilter) query = query.eq("cluster_id", clusterFilter);
  const { data: dueRuns, error: dueError } = await query;
  if (dueError) return json({ error: dueError.message }, 500);

  const results: Json[] = [];
  const emailCache = new Map<string, string | null>();
  const userEmail = async (profileId: string | null): Promise<string | null> => {
    if (!profileId) return null;
    if (emailCache.has(profileId)) return emailCache.get(profileId)!;
    const { data: p } = await admin.from("profiles").select("user_id").eq("id", profileId).maybeSingle();
    let email: string | null = null;
    if (p?.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(p.user_id);
      email = u?.user?.email ?? null;
    }
    emailCache.set(profileId, email);
    return email;
  };

  for (const run of (dueRuns || []) as unknown as Run[]) {
    const automation = run.crm_automations;
    if (!automation || !automation.enabled) continue; // paused: leave the run waiting

    // Claim the run so a parallel invocation skips it
    const { data: claimed } = await admin
      .from("crm_automation_runs")
      .update({ next_run_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
      .eq("id", run.id)
      .eq("status", "running")
      .eq("current_step", run.current_step)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const steps: Step[] = Array.isArray(automation.steps) ? automation.steps : [];
    const log: Json[] = Array.isArray(run.log) ? [...run.log] : [];
    // Execute the due step, then keep going while following steps have no delay
    for (let guard = 0; guard < 25; guard++) {
    const step = steps[run.current_step];
    const ctx: Json = { ...run.context, lead_title: run.crm_deals?.title ?? run.context.lead_title, org_name: run.context.org_name };
    const deal = run.crm_deals;
    const finish = async (patch: Json) => {
      await admin.from("crm_automation_runs").update({ ...patch, log }).eq("id", run.id);
    };

    if (!step) {
      await finish({ status: "completed", completed_at: new Date().toISOString(), next_run_at: null });
      results.push({ run: run.id, status: "completed" });
      break;
    }

    const entry: Json = { at: new Date().toISOString(), step: run.current_step, type: step.type, status: "ok", detail: "" };
    try {
      switch (step.type) {
        case "wait":
          entry.detail = "waited";
          break;

        case "email": {
          const to = lookup(ctx, "email");
          if (!to) { entry.status = "skipped"; entry.detail = "lead has no email"; break; }
          const { key, config: emailConfig } = await getIntegrationKey(run.cluster_id, "resend");
          if (!key) throw new Error("Email not configured: add a Resend API key in Settings → Integrations");
          const senderDomain = (emailConfig?.sender_domain as string) || "notify.checkgrow.com";
          const senderName = (emailConfig?.sender_name as string) || (ctx.org_name as string) || "CheckGrow";
          const replyTo = await userEmail(deal?.assigned_to ?? automation.created_by);
          const subject = render(step.subject, ctx) || `Hello from ${senderName}`;
          const text = render(step.body, ctx);
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${senderName} <hello@${senderDomain}>`,
              to: [to],
              ...(replyTo ? { reply_to: replyTo } : {}),
              subject,
              text,
              html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;color:#2A2722;font-size:15px">${textToHtml(text)}</div>`,
            }),
          });
          const resBody = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(resBody?.message || `Resend ${res.status}`);
          entry.detail = `sent to ${to} (${resBody?.id || "ok"})`;
          if (deal) {
            await admin.from("crm_activities").insert({
              cluster_id: run.cluster_id, deal_id: deal.id, contact_id: run.contact_id,
              activity_type: "email", subject: `Automation email: ${subject}`, content: text.slice(0, 2000),
              created_by: automation.created_by ?? deal.assigned_to,
            }).then(() => {}, () => {});
          }
          break;
        }

        case "task": {
          const assignee = step.assignee_id || deal?.assigned_to || automation.created_by;
          if (!assignee) { entry.status = "skipped"; entry.detail = "no one to assign the task to"; break; }
          const dueDays = Number(step.due_in_days) || 0;
          const { error } = await admin.from("crm_tasks").insert({
            cluster_id: run.cluster_id,
            title: render(step.title, ctx) || "Follow up",
            description: render(step.description, ctx) || null,
            priority: ["low", "medium", "high"].includes(step.priority || "") ? step.priority : "medium",
            status: "pending",
            task_type: "general",
            due_date: dueDays > 0 ? new Date(Date.now() + dueDays * 86400000).toISOString() : null,
            assigned_to: assignee,
            created_by: automation.created_by ?? assignee,
            deal_id: deal?.id ?? null,
            contact_id: run.contact_id,
          });
          if (error) throw new Error(error.message);
          entry.detail = `task created for ${assignee}`;
          break;
        }

        case "assign": {
          if (!deal) { entry.status = "skipped"; entry.detail = "no lead"; break; }
          if (!step.profile_id) { entry.status = "skipped"; entry.detail = "no owner chosen"; break; }
          const { error } = await admin.from("crm_deals").update({ assigned_to: step.profile_id }).eq("id", deal.id);
          if (error) throw new Error(error.message);
          deal.assigned_to = step.profile_id;
          await admin.from("notifications").insert({
            cluster_id: run.cluster_id, recipient_id: step.profile_id, sender_id: automation.created_by ?? step.profile_id,
            notification_type: "deal_assigned", title: `Lead assigned to you: ${deal.title}`,
            content: `By automation "${automation.name}"`, link_type: "deal", link_id: deal.id,
          }).then(() => {}, () => {});
          entry.detail = `owner set to ${step.profile_id}`;
          break;
        }

        case "stage": {
          if (!deal) { entry.status = "skipped"; entry.detail = "no lead"; break; }
          const stage = step.stage || "lead";
          const { error } = await admin.from("crm_deals").update({
            stage, closed_at: stage === "won" ? new Date().toISOString() : null,
          }).eq("id", deal.id);
          if (error) throw new Error(error.message);
          entry.detail = `stage set to ${stage}`;
          break;
        }

        case "notify": {
          const recipient = step.profile_id || deal?.assigned_to || automation.created_by;
          if (!recipient) { entry.status = "skipped"; entry.detail = "no recipient"; break; }
          const { error } = await admin.from("notifications").insert({
            cluster_id: run.cluster_id, recipient_id: recipient, sender_id: automation.created_by ?? recipient,
            notification_type: "automation", title: render(step.title, ctx) || automation.name,
            content: render(step.message, ctx) || null, link_type: deal ? "deal" : null, link_id: deal?.id ?? null,
          });
          if (error) throw new Error(error.message);
          entry.detail = `notified ${recipient}`;
          break;
        }

        default:
          entry.status = "skipped";
          entry.detail = `unknown step type ${String(step.type)}`;
      }
    } catch (e) {
      entry.status = "error";
      entry.detail = e instanceof Error ? e.message : String(e);
      log.push(entry);
      await finish({ status: "failed", error: entry.detail, next_run_at: null });
      results.push({ run: run.id, status: "failed", error: entry.detail });
      break;
    }

    log.push(entry);
    const nextIndex = run.current_step + 1;
    if (nextIndex >= steps.length) {
      await finish({ status: "completed", current_step: nextIndex, completed_at: new Date().toISOString(), next_run_at: null });
      results.push({ run: run.id, status: "completed" });
      break;
    }
    const delay = Math.max(0, Number(steps[nextIndex].delay_minutes) || 0);
    if (delay > 0) {
      await finish({ current_step: nextIndex, next_run_at: new Date(Date.now() + delay * 60000).toISOString() });
      results.push({ run: run.id, status: "advanced", next_step: nextIndex });
      break;
    }
    // Zero delay: persist progress and run the next step in this same pass
    await finish({ current_step: nextIndex, next_run_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    run.current_step = nextIndex;
    }
  }

  return json({ processed: results.length, results });
});
