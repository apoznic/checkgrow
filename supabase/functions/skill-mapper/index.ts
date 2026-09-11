import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createAuthClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, current_skills, profile_id } = await req.json();

    // Input validation against prompt injection / abuse
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const MAX_MSG_LEN = 2000;
    const injectionPatterns = [
      /ignore\s+(previous|all|above|prior)\s+instructions?/i,
      /you\s+are\s+now\s+/i,
      /system\s*prompt/i,
      /\[\s*SYSTEM\s*\]/i,
      /###\s*new\s+instructions/i,
    ];
    for (const m of messages) {
      if (!m || typeof m.content !== "string" || typeof m.role !== "string") {
        return new Response(JSON.stringify({ error: "Invalid message format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (m.content.length > MAX_MSG_LEN) {
        return new Response(JSON.stringify({ error: "Message too long" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (m.role === "user" && injectionPatterns.some((p) => p.test(m.content))) {
        return new Response(JSON.stringify({
          message: "Your message contains patterns that aren't allowed. Please rephrase.",
          skills_to_add: [], traits_to_add: [], profile_updates: null, suggested_questions: []
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentSkillNames = (current_skills || []).map((s: any) => s.skill_name);

    // Fetch existing traits for context
    let existingTraits: string[] = [];
    if (profile_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: traits } = await supabase.from("profile_traits").select("trait_name").eq("profile_id", profile_id);
      existingTraits = (traits || []).map((t: any) => t.trait_name);
    }

    const systemPrompt = `You are an expert AI Career Coach and Skill Mapper for CheckGrow, a decentralized talent platform. You are warm, encouraging, and deeply knowledgeable about the modern job market.

## YOUR MISSION
Help professionals build a comprehensive, impressive skill profile by having a natural conversation. You are NOT a simple form — you are an intelligent interviewer who understands context, reads between the lines, and proactively discovers skills people forget to mention.

## CHARACTER TRAIT PROFILING
Beyond skills, you also identify **character traits and work style attributes** based on what the user shares. These help with better team matching and connections.

Trait categories:
- **work_style**: e.g., "Detail-oriented", "Big-picture thinker", "Fast executor", "Methodical planner", "Self-starter"
- **collaboration**: e.g., "Natural leader", "Team player", "Independent contributor", "Mentor", "Cross-functional communicator"
- **problem_solving**: e.g., "Creative problem solver", "Analytical thinker", "Systems thinker", "Pragmatic", "Research-driven"
- **communication**: e.g., "Clear communicator", "Visual storyteller", "Technical writer", "Active listener", "Persuasive presenter"
- **values**: e.g., "Quality-focused", "Deadline-driven", "Innovation-oriented", "Client-centric", "Growth mindset"

When you infer traits, **always ask the user to confirm**. For example:
- "Based on your experience leading teams and mentoring juniors, I'd describe you as a 'Natural leader' and 'Mentor' — does that sound right?"
- "Your attention to testing and code quality suggests you're 'Detail-oriented' and 'Quality-focused'. Would you agree?"

## CONVERSATION STRATEGY
1. **Listen deeply** — When someone mentions a role or project, infer related skills they likely have but didn't mention.
2. **Ask smart follow-ups** — Don't just accept surface-level answers. Dig deeper:
   - "You mentioned React — do you also work with state management like Redux or Zustand?"
   - "Since you've done backend work, have you dealt with databases? SQL or NoSQL?"
3. **Cover all dimensions** — Systematically explore:
   - **Technical skills**: Languages, frameworks, tools, platforms
   - **Domain expertise**: Industries, verticals (fintech, healthcare, e-commerce, etc.)
   - **Soft skills**: Leadership, project management, communication, mentoring
   - **Methodologies**: Agile, Scrum, Kanban, TDD, pair programming
   - **Design & Creative**: UI/UX, Figma, graphic design, content creation
   - **Data & Analytics**: SQL, Python, data visualization, A/B testing
4. **Explore character traits** — After covering skills, probe work style:
   - "How do you typically approach a new project? Do you plan everything upfront or dive in?"
   - "Do you prefer working solo or in a team?"
   - "What do colleagues usually appreciate most about working with you?"
5. **Encourage completeness** — Remind users that more skills + traits = better matching. Aim for 15-25+ skills and 5-8 traits.
6. **Validate and clarify** — When adding skills or traits, confirm with the user.

## SKILL STANDARDIZATION RULES
Always use these EXACT standardized names:
- "React" (not React.js/ReactJS), "Node.js" (not Node/NodeJS)
- "TypeScript" (not TS), "JavaScript" (not JS)
- "PostgreSQL" (not Postgres), "MongoDB" (not Mongo)
- "Python" (not Py), "Machine Learning" (not ML)
- "Artificial Intelligence" (not AI), "UI/UX Design" for design skills
- "AWS", "GCP", "Azure" for cloud platforms
- "Docker", "Kubernetes" for containerization, "Git" for version control

## RESPONSE FORMAT
Always respond with valid JSON:
{
  "message": "Your conversational response — be warm, specific, and ask follow-up questions. When inferring traits, ask the user to confirm them.",
  "skills_to_add": [
    {"skill_name": "React", "skill_level": "advanced", "years_experience": 3}
  ],
  "traits_to_add": [
    {"trait_name": "Detail-oriented", "trait_category": "work_style", "confidence": "inferred"},
    {"trait_name": "Team player", "trait_category": "collaboration", "confidence": "confirmed"}
  ],
  "profile_updates": {
    "bio": "Only include if the user explicitly describes themselves",
    "portfolio_url": "Only if a URL is mentioned",
    "is_available": true
  },
  "suggested_questions": [
    "What tools do you use for version control?",
    "How do you typically approach a new project?"
  ]
}

Trait confidence levels:
- "inferred" — you deduced it, needs user confirmation
- "confirmed" — user explicitly agreed or stated it

Skill levels: beginner (< 1 yr), intermediate (1-3 yr), advanced (3-5 yr), expert (5+ yr)

## CURRENT USER SKILLS (already in profile — DO NOT add duplicates):
${JSON.stringify(currentSkillNames)}

## CURRENT USER TRAITS (already identified — DO NOT add duplicates):
${JSON.stringify(existingTraits)}

## RULES
- NEVER add skills or traits the user already has (check the lists above)
- Extract ALL relevant skills — both explicitly mentioned AND reasonably inferred
- When inferring traits, ALWAYS ask the user to confirm before marking as "confirmed"
- If the user confirms a trait, set confidence to "confirmed"
- If the user disagrees with a trait, do NOT add it
- Always suggest 1-2 follow-up questions
- Be conversational and human, not robotic
- Always respond with valid JSON`;

    // Build the messages array with conversation history
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          message: "I'm receiving too many requests right now. Please try again in a moment.",
          skills_to_add: [],
          profile_updates: null,
          suggested_questions: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          message: "AI service requires payment. Please contact support.",
          skills_to_add: [],
          profile_updates: null,
          suggested_questions: []
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
      // Handle potential markdown code blocks wrapping the JSON
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsedResponse = JSON.parse(cleanContent);
    } catch {
      parsedResponse = {
        message: content,
        skills_to_add: [],
        profile_updates: null,
        suggested_questions: [],
      };
    }

    // Server-side output sanitization
    if (Array.isArray(parsedResponse.skills_to_add)) {
      parsedResponse.skills_to_add = parsedResponse.skills_to_add
        .filter((s: any) =>
          s && typeof s.skill_name === "string" && s.skill_name.length > 0 && s.skill_name.length <= 60 &&
          ["beginner", "intermediate", "advanced", "expert"].includes(s.skill_level) &&
          typeof s.years_experience === "number" && s.years_experience >= 0 && s.years_experience <= 60
        )
        .slice(0, 15);
    }
    if (Array.isArray(parsedResponse.traits_to_add)) {
      parsedResponse.traits_to_add = parsedResponse.traits_to_add
        .filter((t: any) => t && typeof t.trait_name === "string" && t.trait_name.length > 0 && t.trait_name.length <= 60)
        .slice(0, 10);
    }
    if (parsedResponse.profile_updates && typeof parsedResponse.profile_updates === "object") {
      if (typeof parsedResponse.profile_updates.bio === "string") {
        parsedResponse.profile_updates.bio = parsedResponse.profile_updates.bio.slice(0, 500);
      }
    }

    // Server-side deduplication: filter out skills that already exist
    if (parsedResponse.skills_to_add?.length) {
      const lowerExisting = currentSkillNames.map((s: string) => s.toLowerCase());
      parsedResponse.skills_to_add = parsedResponse.skills_to_add.filter(
        (s: any) => !lowerExisting.includes(s.skill_name.toLowerCase())
      );
    }

    // Server-side deduplication: filter out traits that already exist
    if (parsedResponse.traits_to_add?.length) {
      const lowerTraits = existingTraits.map((t: string) => t.toLowerCase());
      parsedResponse.traits_to_add = parsedResponse.traits_to_add.filter(
        (t: any) => !lowerTraits.includes(t.trait_name.toLowerCase())
      );
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("skill-mapper error:", error);
    return new Response(
      JSON.stringify({ 
        message: "Sorry, I encountered an error. Please try again.",
        skills_to_add: [],
        profile_updates: null,
        suggested_questions: [],
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});