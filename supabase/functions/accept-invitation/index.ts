import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { data: { user } } = await createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser();

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clusterId } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: "clusterId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for a pending invitation for this email + cluster
    const { data: invitation } = await supabase
      .from("cluster_invitations")
      .select("id, status")
      .eq("cluster_id", clusterId)
      .eq("email", user.email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "No pending invitation found", no_invite: true }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("cluster_enrollments")
      .select("id")
      .eq("cluster_id", clusterId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existingEnrollment) {
      // Already enrolled, just mark invitation as accepted
      await supabase
        .from("cluster_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: true, already_enrolled: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-enroll with approved status
    const { error: enrollError } = await supabase
      .from("cluster_enrollments")
      .insert({
        cluster_id: clusterId,
        profile_id: profile.id,
        status: "approved",
        role: "member",
      });

    if (enrollError) {
      console.error("Enrollment error:", enrollError);
      return new Response(
        JSON.stringify({ error: "Failed to enroll: " + enrollError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from("cluster_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ success: true, enrolled: true }),
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
