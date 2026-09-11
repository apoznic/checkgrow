import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(getHtmlResponse('Authorization denied', 'You denied access to Google Calendar. You can close this window.'), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (!code || !stateParam) {
    return new Response(getHtmlResponse('Error', 'Missing authorization code. Please try again.'), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    let state: { token: string; clusterId: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return new Response(getHtmlResponse('Error', 'Invalid state parameter. Please try again.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!state.clusterId) {
      return new Response(getHtmlResponse('Error', 'Missing organization ID. Please try again.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Get org-specific Google credentials
    const { key: GOOGLE_CLIENT_ID, config: googleConfig } = await getIntegrationKey(state.clusterId, 'google_calendar');
    const GOOGLE_CLIENT_SECRET = (googleConfig.client_secret as string) || null;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(getHtmlResponse('Error', 'Google Calendar credentials not configured.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return new Response(getHtmlResponse('Error', 'Failed to exchange authorization code. Please try again.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Verify user from state (JWT)
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${state.token}` } }
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser(state.token);
    if (userError || !user) {
      console.error('JWT verification failed:', userError);
      return new Response(getHtmlResponse('Error', 'Session expired. Please log in and try again.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(getHtmlResponse('Error', 'User profile not found.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Upsert tokens at cluster level
    const { error: upsertError } = await adminSupabase
      .from('cluster_calendar_tokens')
      .upsert({
        cluster_id: state.clusterId,
        connected_by: profile.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
      }, { onConflict: 'cluster_id' });

    if (upsertError) {
      console.error('Token storage failed:', upsertError);
      return new Response(getHtmlResponse('Error', 'Failed to save credentials. Please try again.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response(getHtmlResponse('Connected!', 'Google Calendar is now connected for your organization. You can close this window and refresh your calendar.'), {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('Callback error:', err);
    return new Response(getHtmlResponse('Error', 'An unexpected error occurred. Please try again.'), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

function getHtmlResponse(title: string, message: string) {
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #e5e5e5; }
  .card { text-align: center; padding: 3rem; border-radius: 1rem; background: #1a1a1a; border: 1px solid #333; max-width: 400px; }
  h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  p { color: #999; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 3000);
  </script>
</body>
</html>`;
}
