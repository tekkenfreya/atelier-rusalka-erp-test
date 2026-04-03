import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Cloud, Check, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type CloudProvider = "onedrive" | "googledrive" | "sharepoint";

interface CloudIntegration {
  id: string;
  provider: CloudProvider;
  display_name: string | null;
  is_connected: boolean;
  connected_at: string | null;
}

const providerLabels: Record<CloudProvider, string> = {
  onedrive: "Microsoft OneDrive",
  googledrive: "Google Drive",
  sharepoint: "Microsoft SharePoint",
};

const Settings = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CloudIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<CloudProvider | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("cloud_storage_integrations")
        .select("id, provider, display_name, is_connected, connected_at")
        .eq("user_id", user.id);

      if (error) throw error;
      setIntegrations((data || []) as CloudIntegration[]);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Failed to load cloud storage settings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ONEDRIVE_CONNECTED") {
        toast.success("OneDrive connected successfully!");
        setConnecting(null);
        fetchIntegrations();
      } else if (event.data?.type === "SHAREPOINT_CONNECTED") {
        toast.success("SharePoint connected successfully!");
        setConnecting(null);
        fetchIntegrations();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchIntegrations]);

  const handleConnectMicrosoft = async (provider: "onedrive" | "sharepoint") => {
    if (!user) return;
    
    setConnecting(provider);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        toast.error("Please sign in again");
        setConnecting(null);
        return;
      }

      const redirectUri = window.location.origin + "/settings";
      const functionName = provider === "onedrive" ? "onedrive-auth" : "sharepoint-auth";
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}?action=authorize&redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popupTitle = provider === "onedrive" ? "OneDrive Authorization" : "SharePoint Authorization";
      const popup = window.open(
        result.url,
        popupTitle,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close (fallback if postMessage doesn't work)
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setConnecting(null);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error) {
      console.error(`Error connecting ${provider}:`, error);
      toast.error(`Failed to connect ${providerLabels[provider]}`);
      setConnecting(null);
    }
  };

  const handleConnectGoogleDrive = async () => {
    toast.info("Google Drive integration coming soon!");
  };

  const handleConnect = async (provider: CloudProvider) => {
    if (provider === "onedrive" || provider === "sharepoint") {
      await handleConnectMicrosoft(provider);
    } else {
      await handleConnectGoogleDrive();
    }
  };

  const handleDisconnect = async (provider: CloudProvider) => {
    if (!user) return;
    
    const integration = integrations.find(i => i.provider === provider);
    if (!integration) return;

    try {
      const { error } = await supabase
        .from("cloud_storage_integrations")
        .update({
          is_connected: false,
          connected_at: null,
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
        })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success(`${providerLabels[provider]} disconnected`);
      fetchIntegrations();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error(`Failed to disconnect ${providerLabels[provider]}`);
    }
  };

  const getIntegrationStatus = (provider: CloudProvider) => {
    const integration = integrations.find(i => i.provider === provider);
    return integration?.is_connected || false;
  };

  const getIntegrationDisplayName = (provider: CloudProvider) => {
    const integration = integrations.find(i => i.provider === provider);
    return integration?.display_name;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle>Cloud Storage Integrations</CardTitle>
            </div>
            <CardDescription>
              Connect your cloud storage accounts to enable scheduled export delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {(["onedrive", "sharepoint", "googledrive"] as CloudProvider[]).map((provider) => {
                  const isConnected = getIntegrationStatus(provider);
                  const isConnecting = connecting === provider;
                  const displayName = getIntegrationDisplayName(provider);
                  const isGoogleDrive = provider === "googledrive";

                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isConnected ? "bg-green-100" : "bg-muted"}`}>
                          <Cloud className={`h-5 w-5 ${isConnected ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-medium">{providerLabels[provider]}</p>
                          <p className="text-sm text-muted-foreground">
                            {isConnected ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3" />
                                Connected{displayName ? ` as ${displayName}` : ""}
                              </span>
                            ) : isGoogleDrive ? (
                              "Coming soon"
                            ) : (
                              "Not connected"
                            )}
                          </p>
                        </div>
                      </div>
                      <div>
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(provider)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(provider)}
                            disabled={isConnecting || isGoogleDrive}
                          >
                            {isConnecting ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4 mr-1" />
                            )}
                            {isConnecting ? "Connecting..." : "Connect"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
