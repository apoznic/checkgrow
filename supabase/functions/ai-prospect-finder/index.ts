import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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

    const { description, industry, location, count } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prospectCount = Math.min(count || 5, 10);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a B2B sales prospecting expert. Generate realistic and actionable prospect suggestions based on the ideal customer profile (ICP) description. Each prospect should be a plausible company that would benefit from the described services. Include realistic details but clearly note these are AI-generated suggestions that need verification.`
          },
          {
            role: 'user',
            content: `Generate ${prospectCount} prospect suggestions based on this ideal customer profile:

Description: ${description}
${industry ? `Industry focus: ${industry}` : ''}
${location ? `Location preference: ${location}` : ''}

Generate realistic company profiles that match this ICP. For each, suggest why they'd be a good fit and potential approach strategies.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_prospects',
            description: 'Generate structured prospect suggestions',
            parameters: {
              type: 'object',
              properties: {
                prospects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      company_name: { type: 'string' },
                      industry: { type: 'string' },
                      description: { type: 'string', description: 'What the company does' },
                      estimated_size: { type: 'string', description: 'Small/Medium/Large/Enterprise' },
                      location: { type: 'string' },
                      why_good_fit: { type: 'string', description: 'Why they match the ICP' },
                      approach_strategy: { type: 'string', description: 'Suggested outreach approach' },
                      potential_value: { type: 'string', description: 'Estimated deal value range' },
                      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                    },
                    required: ['company_name', 'industry', 'description', 'why_good_fit', 'confidence'],
                    additionalProperties: false
                  }
                },
                icp_summary: {
                  type: 'string',
                  description: 'Brief summary of the interpreted ICP'
                }
              },
              required: ['prospects', 'icp_summary'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_prospects' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errText = await aiRes.text();
      console.error('AI error:', aiRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'AI did not return structured data' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
