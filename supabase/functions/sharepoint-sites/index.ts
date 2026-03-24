import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

async function refreshSharePointToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Sites.ReadWrite.All offline_access User.Read",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Token refresh error:", data);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sites";
    const siteId = url.searchParams.get("siteId");

    // Get SharePoint integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("cloud_storage_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "sharepoint")
      .eq("is_connected", true)
      .maybeSingle();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: "SharePoint not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = integration.access_token;

    // Check if token is expired and refresh if needed
    const tokenExpiresAt = new Date(integration.token_expires_at);
    if (tokenExpiresAt <= new Date()) {
      console.log("SharePoint token expired, refreshing...");
      const newTokens = await refreshSharePointToken(integration.refresh_token);
      if (!newTokens) {
        return new Response(JSON.stringify({ error: "Failed to refresh SharePoint token. Please reconnect." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update tokens in database
      await supabaseAdmin
        .from("cloud_storage_integrations")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq("id", integration.id);

      accessToken = newTokens.access_token;
    }

    if (action === "sites") {
      // Get user's SharePoint sites
      const sitesResponse = await fetch("https://graph.microsoft.com/v1.0/sites?search=*", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!sitesResponse.ok) {
        const errorText = await sitesResponse.text();
        console.error("Failed to fetch SharePoint sites:", errorText);
        return new Response(JSON.stringify({ error: "Failed to fetch SharePoint sites" }), {
          status: sitesResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sitesData = await sitesResponse.json();
      const sites = sitesData.value.map((site: any) => ({
        id: site.id,
        name: site.displayName || site.name,
        webUrl: site.webUrl,
      }));

      console.log(`Found ${sites.length} SharePoint sites for user ${userId}`);

      return new Response(JSON.stringify({ sites }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "libraries" && siteId) {
      // Get document libraries for a specific site
      const librariesResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!librariesResponse.ok) {
        const errorText = await librariesResponse.text();
        console.error("Failed to fetch document libraries:", errorText);
        return new Response(JSON.stringify({ error: "Failed to fetch document libraries" }), {
          status: librariesResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const librariesData = await librariesResponse.json();
      const libraries = librariesData.value.map((lib: any) => ({
        id: lib.id,
        name: lib.name,
        webUrl: lib.webUrl,
      }));

      console.log(`Found ${libraries.length} document libraries for site ${siteId}`);

      return new Response(JSON.stringify({ libraries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SharePoint sites error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
