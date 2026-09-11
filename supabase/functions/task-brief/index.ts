import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { task, comments, updates } = await req.json();

    const commentHistory = (comments || []).map((c: any) => 
      `- ${c.author} (${c.date}): ${c.content}`
    ).join('\n');

    const updateHistory = (updates || []).map((u: any) =>
      `[${u.date}] ${u.author}: ${u.content}`
    ).join('\n');

    const prompt = `Ti si AI asistent za projekt menadžment. Napravi kratak, koncizan brief/sažetak za ovaj task na hrvatskom jeziku.

TASK: "${task.title}"
STATUS: ${task.status}
PRIORITET: ${task.priority}
${task.description ? `OPIS: ${task.description}` : ''}
${task.assignee ? `ZADUŽEN: ${task.assignee}` : ''}
${task.contact ? `KONTAKT: ${task.contact}` : ''}
${task.deal ? `DEAL: ${task.deal}` : ''}

UPDATES / DNEVNIK:
${updateHistory || '(nema updejtova)'}

KOMENTARI I KOMUNIKACIJA:
${commentHistory || '(nema komentara)'}

Napravi sažetak u sljedećem formatu:
1. **Presjek** — Kratki sažetak o čemu se radi (1-2 rečenice)
2. **Ključne točke** — Najvažnije stvari iz updejtova i komentara (bullet points)
3. **Zaključak/Status** — Gdje smo sada i što je sljedeći korak

Budi koncizan, praktičan i koristan. Maksimalno 150 riječi.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      throw new Error(`AI API failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const brief = data.choices?.[0]?.message?.content || 'Nije moguće generirati brief.';

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in task-brief:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
