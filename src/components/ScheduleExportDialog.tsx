import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Calendar, Cloud, Mail, HardDrive, CheckCircle, AlertCircle, Loader2, Clock, FileSpreadsheet, FileText, FileCode, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SavedExport } from "./NewExportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface ScheduleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportConfig: SavedExport | null;
  onSchedule: (schedule: ScheduleConfig) => void;
}

export interface ScheduleConfig {
  exportId: string;
  frequency: "daily" | "weekly" | "monthly";
  scheduledHour: number;
  destination: "onedrive" | "googledrive" | "email" | "sharepoint";
  destinationPath?: string;
  email?: string;
  format: "excel" | "pdf" | "csv" | "csv-utf8";
  sharepointSiteId?: string;
  sharepointLibraryId?: string;
}

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

interface SharePointLibrary {
  id: string;
  name: string;
  webUrl: string;
}

const ScheduleExportDialog = ({
  open,
  onOpenChange,
  exportConfig,
  onSchedule,
}: ScheduleExportDialogProps) => {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduledHour, setScheduledHour] = useState<number>(9);
  const [destination, setDestination] = useState<"onedrive" | "googledrive" | "email" | "sharepoint">("email");
  const [destinationPath, setDestinationPath] = useState("/Recip3 Exports");
  const [email, setEmail] = useState("");
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | "csv-utf8">("excel");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");

  // Generate hour options (0-23) with local time display
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setHours(i, 0, 0, 0);
    return {
      value: i,
      label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  });

  // Check OneDrive connection status
  const { data: onedriveConnection, isLoading: isLoadingOneDrive } = useQuery({
    queryKey: ["onedrive-connection", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("cloud_storage_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "onedrive")
        .eq("is_connected", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  // Check SharePoint connection status
  const { data: sharepointConnection, isLoading: isLoadingSharePoint } = useQuery({
    queryKey: ["sharepoint-connection", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("cloud_storage_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "sharepoint")
        .eq("is_connected", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  // Fetch SharePoint sites when SharePoint is selected and connected
  const { data: sharepointSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sharepoint-sites", user?.id],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-sites?action=sites`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      return (data.sites || []) as SharePointSite[];
    },
    enabled: open && destination === "sharepoint" && !!sharepointConnection,
  });

  // Fetch SharePoint libraries when site is selected
  const { data: sharepointLibraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ["sharepoint-libraries", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-sites?action=libraries&siteId=${encodeURIComponent(selectedSiteId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      return (data.libraries || []) as SharePointLibrary[];
    },
    enabled: open && destination === "sharepoint" && !!selectedSiteId,
  });

  const isOnedriveConnected = !!onedriveConnection;
  const isSharepointConnected = !!sharepointConnection;

  const handleSchedule = () => {
    if (!exportConfig) return;

    if (destination === "email" && !email) {
      toast.error("Please enter an email address");
      return;
    }

    if (destination === "onedrive" && !isOnedriveConnected) {
      toast.error("Please connect OneDrive in Settings first");
      return;
    }

    if (destination === "onedrive" && !destinationPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }

    if (destination === "sharepoint" && !isSharepointConnected) {
      toast.error("Please connect SharePoint in Settings first");
      return;
    }

    if (destination === "sharepoint" && (!selectedSiteId || !selectedLibraryId)) {
      toast.error("Please select a SharePoint site and document library");
      return;
    }

    if (destination === "googledrive") {
      toast.info("Google Drive integration coming soon");
      return;
    }

    // For SharePoint, store site and library info in destination_path as JSON
    let finalDestinationPath = destinationPath;
    if (destination === "sharepoint") {
      const selectedSite = sharepointSites?.find(s => s.id === selectedSiteId);
      const selectedLibrary = sharepointLibraries?.find(l => l.id === selectedLibraryId);
      finalDestinationPath = JSON.stringify({
        siteId: selectedSiteId,
        siteName: selectedSite?.name,
        libraryId: selectedLibraryId,
        libraryName: selectedLibrary?.name,
        folderPath: destinationPath.trim() || "/",
      });
    }

    onSchedule({
      exportId: exportConfig.id,
      frequency,
      scheduledHour,
      destination,
      destinationPath: destination === "onedrive" || destination === "sharepoint" ? finalDestinationPath : undefined,
      email: destination === "email" ? email : undefined,
      format,
      sharepointSiteId: destination === "sharepoint" ? selectedSiteId : undefined,
      sharepointLibraryId: destination === "sharepoint" ? selectedLibraryId : undefined,
    });

    onOpenChange(false);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFrequency("weekly");
      setScheduledHour(9);
      setDestination("email");
      setDestinationPath("/Recip3 Exports");
      setEmail("");
      setFormat("excel");
      setSelectedSiteId("");
      setSelectedLibraryId("");
    }
  }, [open]);

  // Reset library when site changes
  useEffect(() => {
    setSelectedLibraryId("");
  }, [selectedSiteId]);

  if (!exportConfig) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Export
          </DialogTitle>
          <DialogDescription>
            Configure recurring delivery for "{exportConfig.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Frequency</Label>
            <RadioGroup
              value={frequency}
              onValueChange={(value) => setFrequency(value as "daily" | "weekly" | "monthly")}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem
                  value="daily"
                  id="daily"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="daily"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Daily</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="weekly"
                  id="weekly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="weekly"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Weekly</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="monthly"
                  id="monthly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="monthly"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Monthly</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time of Day
            </Label>
            <Select
              value={scheduledHour.toString()}
              onValueChange={(value) => setScheduledHour(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Export will run at this time (your local time)
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as "excel" | "pdf" | "csv" | "csv-utf8")}
              className="grid grid-cols-2 gap-2"
            >
              <div>
                <RadioGroupItem value="excel" id="format-excel" className="peer sr-only" />
                <Label
                  htmlFor="format-excel"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">Excel</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="pdf" id="format-pdf" className="peer sr-only" />
                <Label
                  htmlFor="format-pdf"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileText className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">PDF</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="csv" id="format-csv" className="peer sr-only" />
                <Label
                  htmlFor="format-csv"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileCode className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">CSV</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="csv-utf8" id="format-csv-utf8" className="peer sr-only" />
                <Label
                  htmlFor="format-csv-utf8"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileCode className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">CSV (UTF-8)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Destination Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Destination</Label>
            <RadioGroup
              value={destination}
              onValueChange={(value) => setDestination(value as "onedrive" | "googledrive" | "email" | "sharepoint")}
              className="space-y-2"
            >
              <div className={`flex items-center space-x-3 rounded-md border p-3 hover:bg-accent cursor-pointer ${destination === "onedrive" ? "border-primary" : ""}`}>
                <RadioGroupItem value="onedrive" id="onedrive" />
                <Label htmlFor="onedrive" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <span className="font-medium">OneDrive</span>
                    <p className="text-xs text-muted-foreground">Save to Microsoft OneDrive</p>
                  </div>
                  {isLoadingOneDrive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isOnedriveConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-md border p-3 hover:bg-accent cursor-pointer ${destination === "sharepoint" ? "border-primary" : ""}`}>
                <RadioGroupItem value="sharepoint" id="sharepoint" />
                <Label htmlFor="sharepoint" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <div className="flex-1">
                    <span className="font-medium">SharePoint</span>
                    <p className="text-xs text-muted-foreground">Save to SharePoint document library</p>
                  </div>
                  {isLoadingSharePoint ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isSharepointConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-md border p-3 hover:bg-accent cursor-pointer opacity-50 ${destination === "googledrive" ? "border-primary" : ""}`}>
                <RadioGroupItem value="googledrive" id="googledrive" disabled />
                <Label htmlFor="googledrive" className="flex items-center gap-2 cursor-pointer flex-1">
                  <HardDrive className="h-4 w-4 text-green-500" />
                  <div>
                    <span className="font-medium">Google Drive</span>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-md border p-3 hover:bg-accent cursor-pointer opacity-50 ${destination === "email" ? "border-primary" : ""}`}>
                <RadioGroupItem value="email" id="email-dest" disabled />
                <Label htmlFor="email-dest" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <div>
                    <span className="font-medium">Email</span>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* OneDrive folder path */}
          {destination === "onedrive" && (
            <div className="space-y-2">
              {!isOnedriveConnected && !isLoadingOneDrive && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    OneDrive is not connected.{" "}
                    <Link to="/settings" className="underline font-medium">
                      Connect in Settings
                    </Link>
                  </p>
                </div>
              )}
              {isOnedriveConnected && (
                <>
                  <Label htmlFor="folder-path">OneDrive Folder Path</Label>
                  <Input
                    id="folder-path"
                    placeholder="/Recip3 Exports"
                    value={destinationPath}
                    onChange={(e) => setDestinationPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Folder will be created if it doesn't exist
                  </p>
                </>
              )}
            </div>
          )}

          {/* SharePoint site and library selection */}
          {destination === "sharepoint" && (
            <div className="space-y-4">
              {!isSharepointConnected && !isLoadingSharePoint && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    SharePoint is not connected.{" "}
                    <Link to="/settings" className="underline font-medium">
                      Connect in Settings
                    </Link>
                  </p>
                </div>
              )}
              {isSharepointConnected && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="sharepoint-site">SharePoint Site</Label>
                    <Select
                      value={selectedSiteId}
                      onValueChange={setSelectedSiteId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingSites ? "Loading sites..." : "Select a site"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sharepointSites?.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSiteId && (
                    <div className="space-y-2">
                      <Label htmlFor="sharepoint-library">Document Library</Label>
                      <Select
                        value={selectedLibraryId}
                        onValueChange={setSelectedLibraryId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isLoadingLibraries ? "Loading libraries..." : "Select a library"} />
                        </SelectTrigger>
                        <SelectContent>
                          {sharepointLibraries?.map((lib) => (
                            <SelectItem key={lib.id} value={lib.id}>
                              {lib.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedLibraryId && (
                    <div className="space-y-2">
                      <Label htmlFor="sharepoint-folder">Folder Path (optional)</Label>
                      <Input
                        id="sharepoint-folder"
                        placeholder="/"
                        value={destinationPath}
                        onChange={(e) => setDestinationPath(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Subfolder within the library (leave as / for root)
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Email Input (conditional) */}
          {destination === "email" && (
            <div className="space-y-2">
              <Label htmlFor="email-input">Email Address</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="recipient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={
              (destination === "onedrive" && !isOnedriveConnected) ||
              (destination === "sharepoint" && (!isSharepointConnected || !selectedSiteId || !selectedLibraryId))
            }
          >
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleExportDialog;
