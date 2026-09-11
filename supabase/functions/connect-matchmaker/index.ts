import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, profileId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context: profiles, skills, traits, clusters, connections, and project chat data
    const [profilesRes, skillsRes, traitsRes, enrollmentsRes, connectionsRes, chatDataRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, bio, city, is_available, work_experience, years_total_experience, project_types").neq("id", profileId),
      supabase.from("profile_skills").select("profile_id, skill_name, proficiency_level, domain"),
      supabase.from("profile_traits").select("profile_id, trait_name, trait_category, confidence, confirmed"),
      supabase.from("cluster_enrollments").select("profile_id, cluster_id, status, clusters(name)").eq("status", "approved"),
      supabase.from("connect_requests").select("sender_profile_id, receiver_profile_id, status").or(`sender_profile_id.eq.${profileId},receiver_profile_id.eq.${profileId}`),
      // Get recent project chat messages for behavioral profiling (last 100 per person)
      supabase.from("messages").select("sender_id, content, created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    // Also get the requesting user's profile, skills, traits, and chat history
    const [myProfileRes, mySkillsRes, myTraitsRes, myEnrollmentsRes, myChatRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, bio, city, project_types, work_experience").eq("id", profileId).single(),
      supabase.from("profile_skills").select("skill_name, domain").eq("profile_id", profileId),
      supabase.from("profile_traits").select("trait_name, trait_category, confirmed").eq("profile_id", profileId),
      supabase.from("cluster_enrollments").select("cluster_id, clusters(name)").eq("profile_id", profileId).eq("status", "approved"),
      supabase.from("messages").select("content").eq("sender_id", profileId).order("created_at", { ascending: false }).limit(50),
    ]);

    const myProfile = myProfileRes.data;
    const mySkills = mySkillsRes.data || [];
    const myTraits = myTraitsRes.data || [];
    const myEnrollments = myEnrollmentsRes.data || [];
    const myChatMessages = (myChatRes.data || []).map((m: any) => m.content).slice(0, 20);

    const profiles = profilesRes.data || [];
    const skills = skillsRes.data || [];
    const traits = traitsRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    const connections = connectionsRes.data || [];
    const chatMessages = chatDataRes.data || [];

    // Build lookup maps
    const skillMap: Record<string, any[]> = {};
    skills.forEach((s: any) => {
      if (!skillMap[s.profile_id]) skillMap[s.profile_id] = [];
      skillMap[s.profile_id].push({ name: s.skill_name, level: s.proficiency_level, domain: s.domain });
    });

    const traitMap: Record<string, any[]> = {};
    traits.forEach((t: any) => {
      if (!traitMap[t.profile_id]) traitMap[t.profile_id] = [];
      traitMap[t.profile_id].push({ name: t.trait_name, category: t.trait_category, confirmed: t.confirmed });
    });

    const clusterMap: Record<string, string[]> = {};
    enrollments.forEach((e: any) => {
      if (!clusterMap[e.profile_id]) clusterMap[e.profile_id] = [];
      const name = e.clusters?.name;
      if (name && !clusterMap[e.profile_id].includes(name)) clusterMap[e.profile_id].push(name);
    });

    // Build chat activity summary per person
    const chatActivityMap: Record<string, number> = {};
    chatMessages.forEach((m: any) => {
      chatActivityMap[m.sender_id] = (chatActivityMap[m.sender_id] || 0) + 1;
    });

    const connectedIds = new Set<string>();
    connections.forEach((c: any) => {
      if (c.status === "accepted") {
        connectedIds.add(c.sender_profile_id === profileId ? c.receiver_profile_id : c.sender_profile_id);
      }
    });

    // Build talent pool context with full names, traits, and activity
    const talentPool = profiles.map((p: any, i: number) => ({
      ref: `person_${i + 1}`,
      id: p.id,
      name: p.full_name || "Anonymous",
      city: p.city || "Unknown",
      available: p.is_available,
      experience_years: p.years_total_experience || 0,
      bio: p.bio || "",
      skills: (skillMap[p.id] || []).map((s: any) => `${s.name} (${s.domain})`).join(", ") || "No skills listed",
      traits: (traitMap[p.id] || []).map((t: any) => `${t.name} [${t.category}${t.confirmed ? ', confirmed' : ''}]`).join(", ") || "No traits identified",
      organizations: (clusterMap[p.id] || []).join(", ") || "None",
      project_activity: chatActivityMap[p.id] ? `${chatActivityMap[p.id]} project messages` : "No project activity",
      already_connected: connectedIds.has(p.id),
    }));

    const systemPrompt = `You are the CheckGrow Connect matchmaker — a friendly, conversational AI that helps people find meaningful connections across the platform.

YOUR USER:
- Name: ${myProfile?.full_name || "Unknown"}
- Location: ${myProfile?.city || "Unknown"}
- Skills: ${mySkills.map((s: any) => s.skill_name).join(", ") || "None listed"}
- Character traits: ${myTraits.map((t: any) => `${t.trait_name} (${t.trait_category}${t.confirmed ? ', confirmed' : ''})`).join(", ") || "None identified yet"}
- Organizations: ${myEnrollments.map((e: any) => e.clusters?.name).filter(Boolean).join(", ") || "None"}
- Bio: ${myProfile?.bio || "No bio"}
- Recent project chat style: ${myChatMessages.length > 0 ? myChatMessages.slice(0, 5).join(" | ") : "No project chat history"}

AVAILABLE PEOPLE (${talentPool.length} total):
${JSON.stringify(talentPool.slice(0, 50), null, 0)}

RULES:
1. Start by warmly greeting the user by name and asking what kind of connection they're looking for.
2. Ask about preferences: skills they want to learn from, regions they're curious about, organizations they want to explore, character traits they value (e.g. detail-oriented, creative), or if they want a random surprise match.
3. Based on their answers, suggest 1-3 matches using the suggest_matches tool. Consider BOTH skills AND character traits for compatibility.
4. You CAN share people's full names, cities, skills, traits, bio, and organization names freely — this is public information.
5. In the preview_label field, use the format: "Full Name from City — Top Skills"
6. When explaining why a match is good, reference character trait compatibility (e.g. "You're both detail-oriented" or "Their creative problem-solving complements your analytical thinking").
7. Consider project activity level — people who are active in project chats tend to be more collaborative.
8. Keep conversations natural, warm, and encouraging. Use emojis sparingly.
9. You can suggest complementary matches (designer meets developer, leader meets executor) and peer matches (similar traits, different regions).
10. If someone is already connected, mention that and suggest someone else.`;

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
          ...messages,
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_matches",
              description: "Suggest 1-3 people to connect with. Returns anonymized previews for the user to choose from.",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        profile_id: { type: "string", description: "The person's ID from the talent pool" },
                        reason: { type: "string", description: "Why this is a good match, in 1-2 sentences" },
                        preview_label: { type: "string", description: "Anonymized label like 'D. from Zagreb — UX Design, React'" },
                      },
                      required: ["profile_id", "reason", "preview_label"],
                    },
                  },
                },
                required: ["matches"],
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("connect-matchmaker error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
