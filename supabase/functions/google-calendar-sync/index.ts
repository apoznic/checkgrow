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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await req.json();
  const { action, clusterId, eventId, eventData, timeMin, timeMax } = body;

  if (!clusterId) {
    return new Response(JSON.stringify({ error: 'clusterId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get cluster-level Google Calendar tokens
  const { data: tokenRecord } = await adminSupabase
    .from('cluster_calendar_tokens')
    .select('*')
    .eq('cluster_id', clusterId)
    .single();

  if (!tokenRecord) {
    return new Response(JSON.stringify({ error: 'Google Calendar not connected for this organization' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get org-specific Google credentials for token refresh
  const { key: GOOGLE_CLIENT_ID, config: googleConfig } = await getIntegrationKey(clusterId, 'google_calendar');
  const GOOGLE_CLIENT_SECRET = (googleConfig.client_secret as string) || null;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'Google Calendar not configured for this organization' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Refresh token if expired
  let accessToken = tokenRecord.access_token;
  if (new Date(tokenRecord.token_expires_at) <= new Date()) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokenRecord.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) {
      console.error('Token refresh failed:', refreshData);
      await adminSupabase.from('cluster_calendar_tokens').delete().eq('cluster_id', clusterId);
      return new Response(JSON.stringify({ error: 'Google Calendar authorization expired. Please reconnect from organization settings.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    accessToken = refreshData.access_token;
    const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
    await adminSupabase.from('cluster_calendar_tokens').update({
      access_token: accessToken,
      token_expires_at: expiresAt,
    }).eq('cluster_id', clusterId);
  }

  const calendarId = tokenRecord.calendar_id || 'primary';
  const GCAL_BASE = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;

  try {
    // PULL: Import events from Google Calendar
    if (action === 'pull') {
      const params = new URLSearchParams({
        timeMin: timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      const res = await fetch(`${GCAL_BASE}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Google Calendar API error [${res.status}]: ${JSON.stringify(data)}`);
      }

      const gcalEvents = (data.items || []).map((item: any) => ({
        google_event_id: item.id,
        title: item.summary || '(No title)',
        description: item.description || null,
        start_date: item.start?.dateTime || `${item.start?.date}T00:00:00Z`,
        end_date: item.end?.dateTime || `${item.end?.date}T23:59:59Z`,
        all_day: !!item.start?.date,
        color: 'blue',
      }));

      let imported = 0;
      for (const gcEvent of gcalEvents) {
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_event_id', gcEvent.google_event_id)
          .eq('cluster_id', clusterId)
          .maybeSingle();

        if (existing) {
          await supabase.from('calendar_events').update({
            title: gcEvent.title,
            description: gcEvent.description,
            start_date: gcEvent.start_date,
            end_date: gcEvent.end_date,
            all_day: gcEvent.all_day,
            synced_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('calendar_events').insert({
            ...gcEvent,
            cluster_id: clusterId,
            created_by: profile.id,
            tags: ['google-calendar'],
            synced_at: new Date().toISOString(),
          });
          imported++;
        }
      }

      return new Response(JSON.stringify({ success: true, imported, total: gcalEvents.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUSH: Create/update event in Google Calendar
    if (action === 'push') {
      if (!eventData) {
        return new Response(JSON.stringify({ error: 'eventData required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const gcalEvent: any = {
        summary: eventData.title,
        description: eventData.description || '',
      };

      if (eventData.all_day) {
        gcalEvent.start = { date: eventData.start_date.split('T')[0] };
        gcalEvent.end = { date: (eventData.end_date || eventData.start_date).split('T')[0] };
      } else {
        gcalEvent.start = { dateTime: eventData.start_date, timeZone: 'UTC' };
        gcalEvent.end = { dateTime: eventData.end_date || eventData.start_date, timeZone: 'UTC' };
      }

      let res;
      let googleEventId = eventData.google_event_id;

      if (googleEventId) {
        res = await fetch(`${GCAL_BASE}/events/${googleEventId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalEvent),
        });
      } else {
        res = await fetch(`${GCAL_BASE}/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalEvent),
        });
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(`Google Calendar API error [${res.status}]: ${JSON.stringify(result)}`);
      }

      if (eventId && !googleEventId) {
        await supabase.from('calendar_events').update({
          google_event_id: result.id,
          synced_at: new Date().toISOString(),
        }).eq('id', eventId);
      }

      return new Response(JSON.stringify({ success: true, google_event_id: result.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE: Remove event from Google Calendar
    if (action === 'delete') {
      if (!eventData?.google_event_id) {
        return new Response(JSON.stringify({ success: true, message: 'No Google event to delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const res = await fetch(`${GCAL_BASE}/events/${eventData.google_event_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        throw new Error(`Google Calendar delete error [${res.status}]: ${text}`);
      } else {
        await res.text();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: pull, push, delete' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Sync error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
