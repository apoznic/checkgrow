import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || !url.includes("linkedin.com")) {
      return new Response(
        JSON.stringify({ error: "Invalid LinkedIn URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For LinkedIn URLs, we can extract basic info from the URL structure
    // Full profile scraping requires LinkedIn API access or browser automation
    // This provides a basic extraction based on URL patterns
    
    const linkedinUsername = url.match(/linkedin\.com\/in\/([^\/\?]+)/)?.[1] || "";
    
    // Try to fetch the page for basic metadata
    // Note: LinkedIn blocks most direct scraping, so this is best-effort
    let name = "";
    let headline = "";
    let company = "";
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract title which often contains name and headline
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1];
          // LinkedIn titles are usually "Name - Headline | LinkedIn"
          const parts = title.split(" - ");
          if (parts.length >= 1) {
            name = parts[0].trim();
          }
          if (parts.length >= 2) {
            headline = parts[1].replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
          }
        }
        
        // Try to extract from meta tags
        const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch && !name) {
          const ogTitle = ogTitleMatch[1];
          const parts = ogTitle.split(" - ");
          if (parts.length >= 1) name = parts[0].trim();
          if (parts.length >= 2) headline = parts[1].trim();
        }
        
        // Extract company if mentioned in headline
        const atMatch = headline.match(/(?:at|@)\s+(.+?)(?:\s*[-|]|$)/i);
        if (atMatch) {
          company = atMatch[1].trim();
        }
      }
    } catch (fetchError) {
      console.log("Could not fetch LinkedIn page directly:", fetchError);
    }
    
    // Format the username as a fallback name
    if (!name && linkedinUsername) {
      name = linkedinUsername
        .replace(/-/g, " ")
        .replace(/\d+$/, "")
        .split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: name || "Unknown",
          headline: headline || null,
          company: company || null,
          linkedinUrl: url,
          source: "linkedin",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in linkedin-scrape:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
