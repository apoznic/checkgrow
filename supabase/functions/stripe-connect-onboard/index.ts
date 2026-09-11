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

    // Get profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action } = await req.json();
    const origin = req.headers.get("origin") || "";

    if (action === "create") {
      // Check if already has account
      const { data: existing } = await serviceClient
        .from("stripe_connect_accounts")
        .select("stripe_account_id")
        .eq("profile_id", profile.id)
        .single();

      let accountId: string;

      if (existing?.stripe_account_id) {
        accountId = existing.stripe_account_id;
      } else {
        // Create Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: { profile_id: profile.id },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;

        // Store in DB
        await serviceClient.from("stripe_connect_accounts").insert({
          profile_id: profile.id,
          stripe_account_id: accountId,
        });
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/account-settings?stripe=refresh`,
        return_url: `${origin}/account-settings?stripe=complete`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: account } = await serviceClient
        .from("stripe_connect_accounts")
        .select("*")
        .eq("profile_id", profile.id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh status from Stripe
      const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
      const charges_enabled = stripeAccount.charges_enabled ?? false;
      const payouts_enabled = stripeAccount.payouts_enabled ?? false;
      const onboarding_complete = charges_enabled && payouts_enabled;

      await serviceClient
        .from("stripe_connect_accounts")
        .update({ charges_enabled, payouts_enabled, onboarding_complete })
        .eq("id", account.id);

      return new Response(
        JSON.stringify({
          connected: true,
          charges_enabled,
          payouts_enabled,
          onboarding_complete,
          stripe_account_id: account.stripe_account_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "dashboard") {
      const { data: account } = await serviceClient
        .from("stripe_connect_accounts")
        .select("stripe_account_id")
        .eq("profile_id", profile.id)
        .single();

      if (!account) throw new Error("No Stripe account found");

      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);
      return new Response(JSON.stringify({ url: loginLink.url }), {
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
