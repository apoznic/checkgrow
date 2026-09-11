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

  try {
    const { url, clusterId } = await req.json();

    if (!url || !clusterId) {
      return new Response(
        JSON.stringify({ error: 'url and clusterId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get org-specific Firecrawl key
    const { key: firecrawlKey } = await getIntegrationKey(clusterId, 'firecrawl');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl not configured. Add your API key in Integrations settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape website with Firecrawl
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL for leads:', formattedUrl);

    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok || !scrapeData.success) {
      return new Response(
        JSON.stringify({ error: scrapeData.error || 'Failed to scrape website' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const websiteContent = scrapeData.data?.markdown || '';
    if (!websiteContent) {
      return new Response(
        JSON.stringify({ error: 'No content found on the page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract structured lead data
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
            content: `You are a B2B lead extraction expert. Analyze website content and extract potential business leads and contact information. Be thorough but only extract real data found on the page — never fabricate information.`
          },
          {
            role: 'user',
            content: `Analyze this website content and extract all potential business leads, contacts, and company information.

Website URL: ${formattedUrl}

Content:
${websiteContent.slice(0, 8000)}

Extract structured data about the company and any contacts found.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_leads',
            description: 'Extract structured lead data from website content',
            parameters: {
              type: 'object',
              properties: {
                company: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Company name' },
                    description: { type: 'string', description: 'What the company does (1-2 sentences)' },
                    industry: { type: 'string', description: 'Industry/sector' },
                    website: { type: 'string', description: 'Website URL' },
                    location: { type: 'string', description: 'City, Country if found' },
                    size: { type: 'string', description: 'Company size if mentioned' },
                  },
                  required: ['name'],
                  additionalProperties: false
                },
                contacts: {
                  type: 'array',
                  description: 'People/contacts found on the website',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      position: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      linkedin: { type: 'string' },
                    },
                    required: ['name'],
                    additionalProperties: false
                  }
                },
                potential_needs: {
                  type: 'array',
                  description: 'Potential project/service needs identified from the website',
                  items: { type: 'string' }
                },
                summary: {
                  type: 'string',
                  description: 'Brief summary of the lead opportunity'
                }
              },
              required: ['company', 'contacts', 'summary'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_leads' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
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
