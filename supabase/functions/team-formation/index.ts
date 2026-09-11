import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize skill names for better matching
function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[_\-\.]+/g, " ") // Normalize separators
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

// Check if two skills match using flexible matching
function skillsMatch(skillA: string, skillB: string): boolean {
  const normA = normalizeSkillName(skillA);
  const normB = normalizeSkillName(skillB);
  
  // Exact match
  if (normA === normB) return true;
  
  // One contains the other (e.g., "React" matches "React.js")
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Common abbreviations and variations
  const variations: Record<string, string[]> = {
    "javascript": ["js", "javascript", "ecmascript"],
    "typescript": ["ts", "typescript"],
    "react": ["react", "reactjs", "react js"],
    "node": ["node", "nodejs", "node js"],
    "python": ["python", "py"],
    "postgresql": ["postgresql", "postgres", "psql"],
    "mongodb": ["mongodb", "mongo"],
    "vue": ["vue", "vuejs", "vue js"],
    "angular": ["angular", "angularjs"],
    "next": ["next", "nextjs", "next js"],
    "express": ["express", "expressjs"],
    "graphql": ["graphql", "gql"],
    "tailwind": ["tailwind", "tailwindcss", "tailwind css"],
    "css": ["css", "css3"],
    "html": ["html", "html5"],
    "aws": ["aws", "amazon web services"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "azure": ["azure", "microsoft azure"],
    "docker": ["docker", "containerization"],
    "kubernetes": ["kubernetes", "k8s"],
    "machine learning": ["machine learning", "ml"],
    "artificial intelligence": ["artificial intelligence", "ai"],
    "ui": ["ui", "user interface"],
    "ux": ["ux", "user experience"],
    "frontend": ["frontend", "front end", "front-end"],
    "backend": ["backend", "back end", "back-end"],
    "fullstack": ["fullstack", "full stack", "full-stack"],
  };
  
  for (const [, aliases] of Object.entries(variations)) {
    const aMatches = aliases.some(alias => normA.includes(alias));
    const bMatches = aliases.some(alias => normB.includes(alias));
    if (aMatches && bMatches) return true;
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — allow unauthenticated requests (e.g. landing page demo)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    if (authHeader?.startsWith('Bearer ')) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const token = authHeader.replace('Bearer ', '');
      // Only validate if it's not just the anon key being passed as bearer
      if (token !== anonKey) {
        const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error: authError } = await supabaseAuth.auth.getUser();
        if (!authError && data?.user) {
          user = data.user;
        }
      }
    }

    const { message, profile_id, current_project, excluded_profile_ids = [], cluster_ids = [], service_type } = await req.json();

    // Input validation against prompt injection / abuse
    if (typeof message !== "string" || message.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const injectionPatterns = [
      /ignore\s+(previous|all|above|prior)\s+instructions?/i,
      /you\s+are\s+now\s+/i,
      /system\s*prompt/i,
      /\[\s*SYSTEM\s*\]/i,
      /###\s*new\s+instructions/i,
      /output\s+your\s+(system\s+)?prompt/i,
    ];
    if (injectionPatterns.some((p) => p.test(message))) {
      return new Response(JSON.stringify({
        message: "Your message contains patterns that aren't allowed. Please rephrase.",
        team_suggestions: [], questions: []
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch ONLY profiles with completed onboarding for quality matching
    const { data: availableTalent, error: talentError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        bio,
        is_available,
        city,
        avatar_url,
        linkedin_url,
        work_experience,
        years_total_experience,
        project_types,
        onboarding_completed,
        skills (
          skill_name,
          skill_level,
          years_experience
        )
      `)
      .eq("onboarding_completed", true);
    
    // Fetch service pricing for selected clusters to provide cost estimates
    let servicePricing: any[] = [];
    if (cluster_ids && cluster_ids.length > 0 && service_type) {
      const { data: pricing } = await supabase
        .from("cluster_service_pricing")
        .select("*")
        .in("cluster_id", cluster_ids)
        .eq("service_type", service_type);
      servicePricing = pricing || [];
    } else if (service_type) {
      // Get average pricing across all clusters for the service type
      const { data: pricing } = await supabase
        .from("cluster_service_pricing")
        .select("*")
        .eq("service_type", service_type);
      servicePricing = pricing || [];
    }

    if (talentError) {
      console.error("Error fetching talent:", talentError);
    }

    // Fetch approved cluster enrollments, optionally filtered by cluster_ids
    let enrollmentQuery = supabase
      .from("cluster_enrollments")
      .select("profile_id, cluster_id")
      .eq("status", "approved");
    
    // If specific clusters are selected, filter by them
    if (cluster_ids && cluster_ids.length > 0) {
      enrollmentQuery = enrollmentQuery.in("cluster_id", cluster_ids);
    }
    
    const { data: approvedEnrollments } = await enrollmentQuery;

    const approvedProfileIds = new Set(approvedEnrollments?.map(e => e.profile_id) || []);
    
    // Build exclusion set
    const excludeSet = new Set([
      ...excluded_profile_ids,
      profile_id,
    ].filter(Boolean));

    // Filter talent pool - ONLY profiles with completed onboarding
    // Include profiles that are: approved in a cluster, not excluded, and have completed onboarding
    const talentPool = (availableTalent || []).filter(t => 
      approvedProfileIds.has(t.id) && 
      !excludeSet.has(t.id) &&
      t.onboarding_completed === true
    );

    // All profiles in the pool have skills (10+ due to onboarding requirement)
    const talentWithSkills = talentPool.filter(t => t.skills && t.skills.length > 0);
    const talentWithoutSkills = talentPool.filter(t => !t.skills || t.skills.length === 0);
    
    // Calculate pricing estimates
    let pricingEstimate = null;
    if (servicePricing.length > 0) {
      const avgPrice = servicePricing.reduce((sum, p) => sum + Number(p.base_price), 0) / servicePricing.length;
      const avgHours = servicePricing.reduce((sum, p) => sum + (p.estimated_hours || 0), 0) / servicePricing.length;
      pricingEstimate = {
        average_price: Math.round(avgPrice),
        min_price: Math.min(...servicePricing.map(p => Number(p.base_price))),
        max_price: Math.max(...servicePricing.map(p => Number(p.base_price))),
        average_hours: Math.round(avgHours),
        currency: servicePricing[0]?.currency || 'EUR',
        service_name: servicePricing[0]?.service_name || service_type,
        organizations_count: servicePricing.length,
      };
    }

    // Format talent with normalized skills and enhanced profile data for AI
    const formattedTalent = talentWithSkills.map((t, index) => ({
      index: index + 1,
      profile_id: t.id,
      name: t.full_name || `Talent #${index + 1}`,
      location: t.city || "Remote",
      bio: t.bio?.slice(0, 300) || "No bio provided",
      available: t.is_available !== false,
      has_avatar: !!t.avatar_url,
      has_linkedin: !!t.linkedin_url,
      work_experience: t.work_experience?.slice(0, 200) || null,
      years_total: t.years_total_experience || 0,
      project_preferences: t.project_types || [],
      skills: t.skills.map((s: any) => ({
        name: s.skill_name,
        normalized: normalizeSkillName(s.skill_name),
        level: s.skill_level || "intermediate",
        years: s.years_experience || 0
      }))
    }));

    // Include profiles without skills but with bios (AI can infer from bio)
    const formattedTalentNoBio = talentWithoutSkills
      .filter(t => t.bio && t.bio.length > 20)
      .map((t, index) => ({
        index: formattedTalent.length + index + 1,
        profile_id: t.id,
        name: t.full_name || `Talent #${formattedTalent.length + index + 1}`,
        location: t.city || "Remote",
        bio: t.bio?.slice(0, 300) || "",
        available: t.is_available !== false,
        skills: [],
        note: "Skills not explicitly listed - infer from bio if relevant"
      }));

    const allFormattedTalent = [...formattedTalent, ...formattedTalentNoBio];

    // Enhanced system prompt with skill matching guidance and pricing context
    const pricingContext = pricingEstimate 
      ? `\n\n## SERVICE PRICING CONTEXT
Service: ${pricingEstimate.service_name}
Average Price: ${pricingEstimate.currency} ${pricingEstimate.average_price}
Price Range: ${pricingEstimate.currency} ${pricingEstimate.min_price} - ${pricingEstimate.max_price}
Average Hours: ${pricingEstimate.average_hours} hours
Based on ${pricingEstimate.organizations_count} organization(s)`
      : "";

    const systemPrompt = `You are an AI Team Formation Agent for CheckGrow, a decentralized talent matching platform.

Your job is to match project owners with the best available talent based on their project needs.
All talent in the pool has completed their onboarding with verified skills (10+ skills), profile photos, and professional information.

## AVAILABLE TALENT POOL (${allFormattedTalent.length} verified professionals)
${allFormattedTalent.length > 0 ? JSON.stringify(allFormattedTalent, null, 2) : "[]"}
${pricingContext}

## SKILL MATCHING RULES
When matching requested skills to talent, be FLEXIBLE:
- "React" matches "React.js", "ReactJS", "React Native"
- "JavaScript" matches "JS", "Node.js", "TypeScript"
- "Python" matches "Django", "Flask", "FastAPI"
- "Design" matches "UI/UX", "Figma", "Adobe XD"
- "Backend" matches "Node", "Python", "Java", "Go"
- "Frontend" matches "React", "Vue", "Angular", "CSS"
- "Database" matches "PostgreSQL", "MongoDB", "MySQL", "SQL"
- Consider related skills (e.g., someone with "React" likely knows "JavaScript")
- Read bios and work_experience for context clues
- Prefer talent with more years_total experience for senior roles

## CRITICAL RULES - MUST FOLLOW
1. ONLY suggest talent from the pool above. Use exact profile_id values.
2. NEVER suggest the same person twice in your team_suggestions array.
3. NEVER make up profiles. If no match exists, say so honestly.
4. If the pool is empty, explain that no verified talent is currently available.
5. Prefer talent marked as "available: true" but can suggest others if skills match well.
6. Maximum 5 team members per suggestion.
7. Be honest about skill gaps - mention if a match is partial.
8. Consider project_preferences when matching (short-term, long-term, full-time).

## RESPONSE FORMAT
{
  "message": "Friendly explanation of your recommendations",
  "project_created": {
    "title": "Project title (max 60 chars)",
    "description": "Full project description",
    "requirements": "Key skills and requirements"
  },
  "team_suggestions": [
    {
      "profile_id": "exact UUID from talent pool",
      "name": "Person's name",
      "role_in_project": "Their role (e.g., Lead Developer)",
      "reason": "Why they fit based on their skills/bio",
      "match_confidence": "high/medium/low",
      "years_experience": 0
    }
  ]
}

Current project context: ${current_project ? JSON.stringify(current_project) : "None - creating new project"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          message: "I'm receiving too many requests right now. Please try again in a moment.",
          project_created: null,
          team_suggestions: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          message: "AI service requires payment. Please contact support.",
          project_created: null,
          team_suggestions: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = {
        message: content,
        project_created: null,
        team_suggestions: [],
      };
    }

    // Validate and deduplicate team suggestions
    const validProfileIds = new Set(talentPool.map(t => t.id));
    const seenProfileIds = new Set<string>();
    
    const validatedSuggestions = (parsedResponse.team_suggestions || [])
      .filter((suggestion: any) => {
        if (!suggestion.profile_id || !validProfileIds.has(suggestion.profile_id)) {
          console.warn("Invalid profile_id:", suggestion.profile_id);
          return false;
        }
        if (seenProfileIds.has(suggestion.profile_id)) {
          console.warn("Duplicate removed:", suggestion.profile_id);
          return false;
        }
        seenProfileIds.add(suggestion.profile_id);
        return true;
      })
      .slice(0, 5);

    parsedResponse.team_suggestions = validatedSuggestions;
    
    // Include pricing estimate in response
    if (pricingEstimate) {
      parsedResponse.pricing_estimate = pricingEstimate;
    }

    console.log(`Team formation: ${talentPool.length} verified profiles, ${validatedSuggestions.length} suggested`);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("team-formation error:", error);
    return new Response(
      JSON.stringify({ 
        message: "Sorry, I encountered an error. Please try again.",
        project_created: null,
        team_suggestions: [],
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
