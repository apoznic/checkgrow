import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { clusterId, title, content, priority, authorName } = await req.json();

    if (!clusterId || !title || !content) {
      return new Response(
        JSON.stringify({ error: "clusterId, title, and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org-specific Resend API key
    const { key: resendApiKey, config: emailConfig } = await getIntegrationKey(clusterId, "resend");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured for this organization. Please add a Resend API key in Integrations settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = "KUT community";
    const fromEmail = "kut@checkgrow.com";

    // Get all approved members of this cluster
    const { data: enrollments, error: enrollError } = await supabase
      .from("cluster_enrollments")
      .select("profile_id, profiles:profile_id ( user_id, full_name )")
      .eq("cluster_id", clusterId)
      .eq("status", "approved");

    if (enrollError) {
      throw new Error(`Failed to fetch members: ${enrollError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get emails for all members
    const userIds = enrollments.map((e: any) => e.profiles?.user_id).filter(Boolean);
    const emailPromises = userIds.map((uid: string) =>
      supabase.auth.admin.getUserById(uid)
    );
    const userResults = await Promise.all(emailPromises);

    const recipients = userResults
      .map((r) => r.data?.user?.email)
      .filter(Boolean) as string[];

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priorityEmoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚠️' : '📢';

    // Send emails in batches via Resend
    const batchSize = 50;
    let totalSent = 0;
    const fromAddress = `${senderName} <${fromEmail}>`;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          bcc: batch,
          to: [fromEmail],
          subject: `${priorityEmoji} ${title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h1 style="font-size: 22px; color: #1a1a2e; margin: 0 0 8px 0;">${priorityEmoji} ${title}</h1>
                <p style="font-size: 13px; color: #888; margin: 0;">Posted by ${authorName || 'a team member'}</p>
              </div>
              <div style="font-size: 15px; color: #333; line-height: 1.7; white-space: pre-wrap;">${content}</div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
              <div style="text-align: center;">
                <a href="https://ai.checkgrow.com/admin"
                   style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Open CheckGrow
                </a>
              </div>
              <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 24px;">
                — The ${senderName} Team
              </p>
            </div>
          `,
        }),
      });

      if (emailRes.ok) {
        totalSent += batch.length;
      } else {
        const errBody = await emailRes.json();
        console.error("Resend batch error:", errBody);
        // Return the actual error to the caller
        if (i === 0) {
          return new Response(
            JSON.stringify({ error: errBody.message || "Email sending failed", resend_error: true }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
