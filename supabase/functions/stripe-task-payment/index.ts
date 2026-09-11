import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action, billable_task_id } = await req.json();
    const origin = req.headers.get("origin") || "";

    if (action === "create-checkout") {
      // Get the billable task
      const { data: task } = await serviceClient
        .from("billable_tasks")
        .select("*, projects:project_id(cluster_id)")
        .eq("id", billable_task_id)
        .single();

      if (!task) throw new Error("Task not found");
      if (task.status !== "approved") throw new Error("Task must be approved before payment");
      if (!task.assigned_to) throw new Error("No assignee on this task");

      // Get the assignee's Stripe Connect account
      const { data: connectAccount } = await serviceClient
        .from("stripe_connect_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("profile_id", task.assigned_to)
        .single();

      if (!connectAccount?.charges_enabled) {
        throw new Error("Assignee has not completed Stripe onboarding");
      }

      // Get platform fee from org
      const clusterId = (task as any).projects?.cluster_id;
      let platformFeePercent = 10;

      if (clusterId) {
        const { data: cluster } = await serviceClient
          .from("clusters")
          .select("platform_fee_percent")
          .eq("id", clusterId)
          .single();
        if (cluster) platformFeePercent = cluster.platform_fee_percent;
      }

      const amountInCents = Math.round(task.fixed_price * 100);
      const platformFeeInCents = Math.round(amountInCents * (platformFeePercent / 100));

      // Create Checkout session with destination charge
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: task.currency || "eur",
              product_data: {
                name: task.title,
                description: task.description || undefined,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: platformFeeInCents,
          transfer_data: {
            destination: connectAccount.stripe_account_id,
          },
        },
        success_url: `${origin}/project/${task.project_id}?payment=success&task=${task.id}`,
        cancel_url: `${origin}/project/${task.project_id}?payment=cancelled`,
        metadata: {
          billable_task_id: task.id,
          project_id: task.project_id,
          platform_fee_percent: platformFeePercent.toString(),
        },
      });

      // Store checkout session on the task
      await serviceClient
        .from("billable_tasks")
        .update({
          stripe_checkout_session_id: session.id,
          platform_fee_percent: platformFeePercent,
          platform_fee_amount: platformFeeInCents / 100,
        })
        .eq("id", task.id);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify-payment") {
      const { data: task } = await serviceClient
        .from("billable_tasks")
        .select("stripe_checkout_session_id")
        .eq("id", billable_task_id)
        .single();

      if (!task?.stripe_checkout_session_id) throw new Error("No checkout session");

      const session = await stripe.checkout.sessions.retrieve(task.stripe_checkout_session_id);

      if (session.payment_status === "paid") {
        await serviceClient
          .from("billable_tasks")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", billable_task_id);

        return new Response(JSON.stringify({ paid: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ paid: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
