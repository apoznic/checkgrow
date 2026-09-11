import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const clusterId = url.searchParams.get('clusterId');

  // Generate the OAuth URL — only Owner/Admin can connect
  if (action === 'authorize') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !clusterId) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing clusterId' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get org-specific Google credentials
    let googleClientId: string | null = null;
    let googleClientSecret: string | null = null;
    try {
      const result = await getIntegrationKey(clusterId, 'google_calendar');
      googleClientId = result.key;
      googleClientSecret = (result.config.client_secret as string) || null;
    } catch (e) {
      console.error('Failed to get Google Calendar credentials:', e);
      return new Response(JSON.stringify({ error: 'Failed to decrypt Google Calendar credentials. Please re-enter your API keys in Integrations settings.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!googleClientId || !googleClientSecret) {
      return new Response(JSON.stringify({ error: 'Google Calendar not configured for this organization. Please add Google Client ID and Client Secret in Integrations settings.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate that the client ID looks like a Google client ID
    if (!googleClientId.includes('.apps.googleusercontent.com')) {
      console.error('Invalid Google Client ID format:', googleClientId.substring(0, 10) + '...');
      return new Response(JSON.stringify({ error: 'Invalid Google Client ID. It should end with .apps.googleusercontent.com. Please check your Integrations settings.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const state = JSON.stringify({ token: authHeader.replace('Bearer ', ''), clusterId });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account consent');
    authUrl.searchParams.set('state', btoa(state));

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check connection status — cluster-level
  if (action === 'status') {
    if (!clusterId) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: tokenData } = await supabase
      .from('cluster_calendar_tokens')
      .select('id, calendar_id, updated_at, connected_by, profiles:connected_by(full_name)')
      .eq('cluster_id', clusterId)
      .single();

    return new Response(JSON.stringify({ 
      connected: !!tokenData,
      calendar_id: tokenData?.calendar_id || 'primary',
      connected_by: (tokenData?.profiles as any)?.full_name || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Disconnect — cluster-level, only Owner/Admin
  if (action === 'disconnect') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !clusterId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // RLS will enforce owner/admin check
    const { error } = await supabase
      .from('cluster_calendar_tokens')
      .delete()
      .eq('cluster_id', clusterId);

    if (error) {
      return new Response(JSON.stringify({ error: 'Only organization owners/admins can disconnect Google Calendar' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
