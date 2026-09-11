import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const body = await req.json();
    const { action, clusterId, serviceName, apiKey, config } = body;

    if (!clusterId) {
      return new Response(JSON.stringify({ error: "clusterId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner/admin of this cluster
    const { data: hasRole } = await supabase.rpc("has_org_role", {
      _user_id: user.id,
      _cluster_id: clusterId,
      _roles: ["owner", "admin"],
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST: Get all integrations for this cluster (without keys)
    if (action === "list") {
      const { data: integrations, error } = await supabase
        .from("cluster_integrations")
        .select("id, service_name, config, is_active, created_at, updated_at")
        .eq("cluster_id", clusterId);

      if (error) throw error;

      return new Response(JSON.stringify({ integrations: integrations || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPSERT: Add or update an integration key
    if (action === "upsert") {
      if (!serviceName || !apiKey) {
        return new Response(JSON.stringify({ error: "serviceName and apiKey required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedKey = await encrypt(apiKey);
      const incomingConfig = config && typeof config === "object" && !Array.isArray(config)
        ? config
        : {};

      const { data: existingIntegration, error: existingError } = await supabase
        .from("cluster_integrations")
        .select("config")
        .eq("cluster_id", clusterId)
        .eq("service_name", serviceName)
        .maybeSingle();

      if (existingError) throw existingError;

      const mergedConfig = {
        ...((existingIntegration?.config as Record<string, unknown> | null) ?? {}),
        ...incomingConfig,
      };

      const { error } = await supabase
        .from("cluster_integrations")
        .upsert(
          {
            cluster_id: clusterId,
            service_name: serviceName,
            encrypted_key: encryptedKey,
            config: mergedConfig,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "cluster_id,service_name" }
        );

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TOGGLE: Enable/disable an integration
    if (action === "toggle") {
      if (!serviceName) {
        return new Response(JSON.stringify({ error: "serviceName required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("cluster_integrations")
        .select("is_active")
        .eq("cluster_id", clusterId)
        .eq("service_name", serviceName)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Integration not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("cluster_integrations")
        .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
        .eq("cluster_id", clusterId)
        .eq("service_name", serviceName);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, is_active: !existing.is_active }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE: Remove an integration
    if (action === "delete") {
      if (!serviceName) {
        return new Response(JSON.stringify({ error: "serviceName required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("cluster_integrations")
        .delete()
        .eq("cluster_id", clusterId)
        .eq("service_name", serviceName);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
