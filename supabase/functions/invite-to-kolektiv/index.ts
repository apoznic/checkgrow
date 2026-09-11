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

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get calling user
    const { data: { user: callingUser } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser();

    if (!callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, clusterId, clusterName, inviterName } = await req.json();

    if (!email || !clusterId) {
      return new Response(
        JSON.stringify({ error: "email and clusterId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter's profile_id
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", callingUser.id)
      .single();

    if (!inviterProfile) {
      return new Response(
        JSON.stringify({ error: "Inviter profile not found" }),
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

    const senderDomain = (emailConfig.sender_domain as string) || "notify.checkgrow.com";
    const senderName = (emailConfig.sender_name as string) || "CheckGrow";

    // Check if user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let alreadyMember = false;

    if (existingUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", existingUser.id)
        .single();

      if (profile) {
        const { data: enrollment } = await supabase
          .from("cluster_enrollments")
          .select("id, status")
          .eq("cluster_id", clusterId)
          .eq("profile_id", profile.id)
          .maybeSingle();

        if (enrollment) {
          alreadyMember = true;
        }
      }
    }

    if (alreadyMember) {
      return new Response(
        JSON.stringify({ error: "This person is already a member or has a pending request" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save invitation to DB (upsert to handle re-invites)
    const { error: inviteError } = await supabase
      .from("cluster_invitations")
      .upsert({
        cluster_id: clusterId,
        email: email.toLowerCase().trim(),
        invited_by: inviterProfile.id,
        status: "pending",
        created_at: new Date().toISOString(),
        accepted_at: null,
      }, { onConflict: "cluster_id,email" });

    if (inviteError) {
      console.error("Failed to save invitation:", inviteError);
    }

    const orgName = clusterName || "an organization";
    const senderDisplayName = inviterName || "Someone";

    // Build the signup URL - use the published app URL
    const signupUrl = `https://ai.checkgrow.com/auth?mode=signup&invite_cluster=${clusterId}`;

    // Send invitation email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <notify@${senderDomain}>`,
        to: [email],
        subject: `🤝 ${senderDisplayName} invited you to join "${orgName}" on CheckGrow`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #1a1a2e; margin-bottom: 16px;">You're invited! 🤝</h1>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              Hi there,
            </p>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              <strong>${senderDisplayName}</strong> has invited you to join <strong>"${orgName}"</strong> on CheckGrow — a platform for building liquid teams and managing collaborative projects.
            </p>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              Click below to create your account and join the team instantly — no approval needed.
            </p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${signupUrl}"
                 style="display: inline-block; padding: 14px 36px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Join ${orgName}
              </a>
            </div>
            <p style="font-size: 13px; color: #888; margin-top: 32px; text-align: center;">
              — The ${senderName} Team
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      const errorMsg = emailResult?.message || "Failed to send invitation email";
      return new Response(
        JSON.stringify({ error: errorMsg, resend_error: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email }),
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
