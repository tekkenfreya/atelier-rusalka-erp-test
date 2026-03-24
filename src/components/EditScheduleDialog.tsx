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
import { Settings, Clock, FileSpreadsheet, FileText, FileCode, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface SharePointConfig {
  siteId: string;
  siteName?: string;
  libraryId: string;
  libraryName?: string;
  folderPath: string;
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

interface ScheduledExportData {
  id: string;
  frequency: string;
  scheduled_hour: number;
  destination: string;
  destination_path: string | null;
  email: string | null;
  format: string;
  saved_exports: {
    name: string;
  } | null;
}

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduledExportData | null;
  onSave: (data: {
    id: string;
    frequency: string;
    scheduledHour: number;
    destinationPath: string;
    format: string;
  }) => void;
}

const EditScheduleDialog = ({
  open,
  onOpenChange,
  schedule,
  onSave,
}: EditScheduleDialogProps) => {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [scheduledHour, setScheduledHour] = useState<number>(9);
  const [destinationPath, setDestinationPath] = useState("/Recip3 Exports");
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | "csv-utf8">("excel");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");

  const isSharePoint = schedule?.destination === "sharepoint";

  // Generate hour options (0-23) with local time display
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setHours(i, 0, 0, 0);
    return {
      value: i,
      label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  });

  // Fetch SharePoint sites
  const { data: sharepointSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sharepoint-sites-edit", user?.id],
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
    enabled: open && isSharePoint,
  });

  // Fetch SharePoint libraries when site is selected
  const { data: sharepointLibraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ["sharepoint-libraries-edit", selectedSiteId],
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
    enabled: open && isSharePoint && !!selectedSiteId,
  });

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      setFrequency(schedule.frequency as "daily" | "weekly" | "monthly");
      setScheduledHour(schedule.scheduled_hour);
      setFormat((schedule.format as "excel" | "pdf" | "csv" | "csv-utf8") || "excel");

      // Parse SharePoint config if applicable
      if (schedule.destination === "sharepoint" && schedule.destination_path) {
        try {
          const config: SharePointConfig = JSON.parse(schedule.destination_path);
          setSelectedSiteId(config.siteId || "");
          setSelectedLibraryId(config.libraryId || "");
          setDestinationPath(config.folderPath || "/");
        } catch {
          setDestinationPath(schedule.destination_path);
        }
      } else {
        setDestinationPath(schedule.destination_path || "/Recip3 Exports");
      }
    }
  }, [schedule]);

  // Reset library when site changes (but only if user actually changes it)
  useEffect(() => {
    // Don't reset if we're loading initial data
    if (schedule?.destination === "sharepoint" && schedule.destination_path) {
      try {
        const config: SharePointConfig = JSON.parse(schedule.destination_path);
        if (config.siteId === selectedSiteId) return;
      } catch {
        // Not JSON, continue with reset
      }
    }
    setSelectedLibraryId("");
  }, [selectedSiteId, schedule]);

  const handleSave = () => {
    if (!schedule) return;

    let finalDestinationPath = destinationPath;
    if (schedule.destination === "sharepoint") {
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

    onSave({
      id: schedule.id,
      frequency,
      scheduledHour,
      destinationPath: finalDestinationPath,
      format,
    });

    onOpenChange(false);
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Schedule
          </DialogTitle>
          <DialogDescription>
            Modify schedule for "{schedule.saved_exports?.name}"
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
                  id="edit-daily"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="edit-daily"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Daily</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="weekly"
                  id="edit-weekly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="edit-weekly"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Weekly</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="monthly"
                  id="edit-monthly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="edit-monthly"
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
                <RadioGroupItem value="excel" id="edit-format-excel" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-excel"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">Excel</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="pdf" id="edit-format-pdf" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-pdf"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileText className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">PDF</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="csv" id="edit-format-csv" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-csv"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileCode className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">CSV</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="csv-utf8" id="edit-format-csv-utf8" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-csv-utf8"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileCode className="h-4 w-4 mb-1" />
                  <span className="text-sm font-medium">CSV (UTF-8)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* OneDrive Destination Path */}
          {schedule.destination === "onedrive" && (
            <div className="space-y-2">
              <Label htmlFor="edit-folder-path">OneDrive Folder Path</Label>
              <Input
                id="edit-folder-path"
                placeholder="/Recip3 Exports"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Folder will be created if it doesn't exist
              </p>
            </div>
          )}

          {/* SharePoint site and library selection */}
          {schedule.destination === "sharepoint" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sharepoint-site">SharePoint Site</Label>
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
                {isLoadingSites && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading sites...
                  </div>
                )}
              </div>

              {selectedSiteId && (
                <div className="space-y-2">
                  <Label htmlFor="edit-sharepoint-library">Document Library</Label>
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
                  {isLoadingLibraries && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading libraries...
                    </div>
                  )}
                </div>
              )}

              {selectedLibraryId && (
                <div className="space-y-2">
                  <Label htmlFor="edit-sharepoint-folder">Folder Path (optional)</Label>
                  <Input
                    id="edit-sharepoint-folder"
                    placeholder="/"
                    value={destinationPath}
                    onChange={(e) => setDestinationPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Subfolder within the library (leave as / for root)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={schedule.destination === "sharepoint" && (!selectedSiteId || !selectedLibraryId)}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduleDialog;
