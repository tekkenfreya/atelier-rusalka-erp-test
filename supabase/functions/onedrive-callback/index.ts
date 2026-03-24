import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/onedrive-callback`;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error, url.searchParams.get("error_description"));
      return new Response(
        `<html><body><script>window.close();</script>OAuth error: ${error}</body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><script>window.close();</script>Missing code or state</body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        `<html><body><script>window.close();</script>Invalid state</body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const { userId, redirectUri } = stateData;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("Token exchange error:", tokens);
      return new Response(
        `<html><body><script>window.close();</script>Token error: ${tokens.error}</body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Get user profile from Microsoft Graph
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json();

    console.log("OneDrive connected for user:", userId, "Microsoft account:", profile.userPrincipalName || profile.mail);

    // Store tokens in database using service role
    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check if integration exists
    const { data: existing } = await supabaseAdmin
      .from("cloud_storage_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "onedrive")
      .maybeSingle();

    const integrationData = {
      user_id: userId,
      provider: "onedrive",
      is_connected: true,
      connected_at: new Date().toISOString(),
      display_name: profile.userPrincipalName || profile.mail || profile.displayName,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    };

    if (existing) {
      await supabaseAdmin
        .from("cloud_storage_integrations")
        .update(integrationData)
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("cloud_storage_integrations")
        .insert(integrationData);
    }

    // Redirect back to app
    return new Response(
      `<html><body><script>
        window.opener?.postMessage({ type: 'ONEDRIVE_CONNECTED' }, '*');
        window.close();
      </script><p>Connected! You can close this window.</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("OneDrive callback error:", err);
    return new Response(
      `<html><body><script>window.close();</script>Error: ${errorMessage}</body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
});
