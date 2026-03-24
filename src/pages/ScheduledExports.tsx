import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, FileSpreadsheet, Save, Play, Trash2, Loader2, Pencil, FileText, Plus } from "lucide-react";
import NewExportDialog, { SavedExport, BatchConfig } from "@/components/NewExportDialog";
import NewReportDialog, { SavedReport } from "@/components/NewReportDialog";
import SavedExportsTable from "@/components/SavedExportsTable";
import ExportDownloadDialog from "@/components/ExportDownloadDialog";
import ScheduleExportDialog, { ScheduleConfig } from "@/components/ScheduleExportDialog";
import EditScheduleDialog from "@/components/EditScheduleDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduledExportRow {
  id: string;
  user_id: string;
  saved_export_id: string;
  frequency: string;
  scheduled_hour: number;
  destination: string;
  destination_path: string | null;
  email: string | null;
  format: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  saved_exports: {
    id: string;
    name: string;
    type: string;
    fields: string[];
  } | null;
}

interface ExportHistoryRow {
  id: string;
  scheduled_export_id: string;
  status: string;
  file_name: string | null;
  file_size: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  scheduled_exports?: {
    saved_exports?: {
      name: string;
    } | null;
  } | null;
}

const ScheduledExports = () => {
  const { isAdmin, isEditor, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedExportForDownload, setSelectedExportForDownload] = useState<SavedExport | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedExportForSchedule, setSelectedExportForSchedule] = useState<SavedExport | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedScheduleForEdit, setSelectedScheduleForEdit] = useState<ScheduledExportRow | null>(null);
  const [deleteScheduleDialogOpen, setDeleteScheduleDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduledExportRow | null>(null);

  const canAccessReporting = isAdmin || isEditor;

  useEffect(() => {
    if (!canAccessReporting) {
      navigate("/");
    }
  }, [canAccessReporting, navigate]);

  // Fetch saved exports from database
  const { data: savedExports = [], isLoading: isLoadingSavedExports } = useQuery({
    queryKey: ["saved-exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_exports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        fields: row.fields,
        batchConfig: row.batch_config as unknown as BatchConfig | null,
        createdAt: new Date(row.created_at),
      })) as SavedExport[];
    },
    enabled: canAccessReporting,
  });

  // Fetch scheduled exports
  const { data: scheduledExports = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["scheduled-exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_exports")
        .select(`
          *,
          saved_exports (
            id,
            name,
            type,
            fields
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ScheduledExportRow[];
    },
    enabled: canAccessReporting,
  });

  // Fetch export history
  const { data: exportHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["export-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_history")
        .select(`
          *,
          scheduled_exports (
            saved_exports (
              name
            )
          )
        `)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ExportHistoryRow[];
    },
    enabled: canAccessReporting,
  });

  const generateExportName = (type: string) => {
    const count = savedExports.filter((e) => e.type === type).length + 1;
    const paddedNumber = String(count).padStart(5, "0");
    return `${type.charAt(0).toUpperCase() + type.slice(1)}_${paddedNumber}`;
  };

  // Create saved export mutation
  const createExportMutation = useMutation({
    mutationFn: async (config: Omit<SavedExport, "id" | "name" | "createdAt">) => {
      const name = generateExportName(config.type);
      const { data, error } = await supabase
        .from("saved_exports")
        .insert({
          user_id: user?.id ?? "",
          name,
          type: config.type as string,
          fields: config.fields,
          batch_config: config.batchConfig ? JSON.parse(JSON.stringify(config.batchConfig)) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saved-exports"] });
      toast.success(`Export "${data.name}" saved successfully`);
    },
    onError: () => {
      toast.error("Failed to save export");
    },
  });

  // Delete saved export mutation
  const deleteExportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_exports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-exports"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Export deleted");
    },
    onError: () => {
      toast.error("Failed to delete export");
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (config: ScheduleConfig) => {
      // Calculate initial next_run_at based on frequency and scheduled hour (local time)
      const now = new Date();
      let nextRunAt = new Date(now);
      
      // Set the scheduled hour in local time
      nextRunAt.setHours(config.scheduledHour, 0, 0, 0);
      
      // If the scheduled time for today has already passed, move to next interval
      if (nextRunAt <= now) {
        switch (config.frequency) {
          case "daily":
            nextRunAt.setDate(nextRunAt.getDate() + 1);
            break;
          case "weekly":
            nextRunAt.setDate(nextRunAt.getDate() + 7);
            break;
          case "monthly":
            nextRunAt.setMonth(nextRunAt.getMonth() + 1);
            break;
        }
      }

      // Store the scheduled_hour in local time value
      const { error } = await supabase.from("scheduled_exports").insert({
        user_id: user?.id,
        saved_export_id: config.exportId,
        frequency: config.frequency,
        scheduled_hour: config.scheduledHour,
        destination: config.destination,
        destination_path: config.destinationPath,
        email: config.email,
        format: config.format,
        next_run_at: nextRunAt.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Schedule created successfully");
    },
    onError: () => {
      toast.error("Failed to create schedule");
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_exports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      queryClient.invalidateQueries({ queryKey: ["export-history"] });
      toast.success("Schedule deleted");
    },
    onError: () => {
      toast.error("Failed to delete schedule");
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { id: string; frequency: string; scheduledHour: number; destinationPath: string; format: string }) => {
      // Calculate new next_run_at based on updated frequency and hour
      const now = new Date();
      const nextRunAt = new Date(now);
      nextRunAt.setHours(data.scheduledHour, 0, 0, 0);
      
      if (nextRunAt <= now) {
        switch (data.frequency) {
          case "daily":
            nextRunAt.setDate(nextRunAt.getDate() + 1);
            break;
          case "weekly":
            nextRunAt.setDate(nextRunAt.getDate() + 7);
            break;
          case "monthly":
            nextRunAt.setMonth(nextRunAt.getMonth() + 1);
            break;
        }
      }

      const { error } = await supabase
        .from("scheduled_exports")
        .update({
          frequency: data.frequency,
          scheduled_hour: data.scheduledHour,
          destination_path: data.destinationPath,
          format: data.format,
          next_run_at: nextRunAt.toISOString(),
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Schedule updated successfully");
    },
    onError: () => {
      toast.error("Failed to update schedule");
    },
  });

  // Run schedule now mutation
  const runScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      setRunningScheduleId(scheduleId);
      const { data, error } = await supabase.functions.invoke("run-scheduled-export", {
        body: { scheduleId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["export-history"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      if (data?.results?.[0]?.success) {
        toast.success("Export completed successfully");
      } else {
        toast.error(data?.results?.[0]?.error || "Export failed");
      }
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
    onSettled: () => {
      setRunningScheduleId(null);
    },
  });

  const handleSaveExport = (config: Omit<SavedExport, "id" | "name" | "createdAt">) => {
    createExportMutation.mutate(config);
  };

  const handleDownload = (exportConfig: SavedExport) => {
    setSelectedExportForDownload(exportConfig);
    setDownloadDialogOpen(true);
  };

  const handleSchedule = (exportConfig: SavedExport) => {
    setSelectedExportForSchedule(exportConfig);
    setScheduleDialogOpen(true);
  };

  const handleScheduleConfirm = (schedule: ScheduleConfig) => {
    createScheduleMutation.mutate(schedule);
  };

  const handleDelete = (id: string) => {
    deleteExportMutation.mutate(id);
  };

  const handleEditSchedule = (schedule: ScheduledExportRow) => {
    setSelectedScheduleForEdit(schedule);
    setEditDialogOpen(true);
  };

  const handleDeleteScheduleClick = (schedule: ScheduledExportRow) => {
    setScheduleToDelete(schedule);
    setDeleteScheduleDialogOpen(true);
  };

  const handleConfirmDeleteSchedule = () => {
    if (scheduleToDelete) {
      deleteScheduleMutation.mutate(scheduleToDelete.id);
    }
    setDeleteScheduleDialogOpen(false);
    setScheduleToDelete(null);
  };

  const handleSaveScheduleEdit = (data: { id: string; frequency: string; scheduledHour: number; destinationPath: string; format: string }) => {
    updateScheduleMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!canAccessReporting) return null;

  return (
    <div className="space-y-8">
      {/* Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Generate and view reports from your data
            </p>
          </div>
          <NewReportDialog onSave={(config) => {
            // TODO: Implement report saving logic
          }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Standard Reports
            </CardTitle>
            <CardDescription>
              Pre-configured reports for common use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <a 
                        href="/reports/ingredient-stock-levels" 
                        onClick={(e) => { e.preventDefault(); navigate("/reports/ingredient-stock-levels"); }}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        Ingredient Stock Levels
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">Overview of current stock levels for all ingredients</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <a 
                        href="/reports/startup-project-completion" 
                        onClick={(e) => { e.preventDefault(); navigate("/reports/startup-project-completion"); }}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        Startup Project Completion
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">Track product development stages from planning to manufacturing</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Reports
            </CardTitle>
            <CardDescription>
              Your generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No reports yet</p>
              <p className="text-sm text-muted-foreground">
                Create a new report to get started
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Exports</h2>
            <p className="text-muted-foreground">
              Create and schedule automated exports of your data
            </p>
          </div>
          <NewExportDialog onSave={handleSaveExport} />
        </div>

      {/* Saved Exports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Saved Exports
          </CardTitle>
          <CardDescription>
            Your saved export configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSavedExports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SavedExportsTable
              exports={savedExports}
              onDownload={handleDownload}
              onSchedule={handleSchedule}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Scheduled Exports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Exports
          </CardTitle>
          <CardDescription>
            Active recurring export schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scheduledExports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No scheduled exports yet</p>
              <p className="text-sm text-muted-foreground">
                Create a schedule from your saved exports above
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Export</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="hidden md:table-cell">Next Run</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledExports.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.saved_exports?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {schedule.frequency} at {schedule.scheduled_hour.toString().padStart(2, '0')}:00
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="capitalize">{schedule.destination}</span>
                          {schedule.destination_path && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {schedule.destination_path}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {schedule.next_run_at
                          ? format(new Date(schedule.next_run_at), "dd MMM yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {schedule.last_run_at
                          ? format(new Date(schedule.last_run_at), "dd MMM yyyy HH:mm")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchedule(schedule)}
                            title="Edit schedule"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runScheduleMutation.mutate(schedule.id)}
                            disabled={runningScheduleId === schedule.id}
                            title="Run now"
                          >
                            {runningScheduleId === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteScheduleClick(schedule)}
                            title="Delete schedule"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            View previously generated scheduled exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exportHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No export history yet</p>
              <p className="text-sm text-muted-foreground">
                Scheduled exports will appear here once they run
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Export</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">File</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-medium">
                        {history.scheduled_exports?.saved_exports?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{getStatusBadge(history.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {history.file_name ? (
                          <span className="text-sm">{history.file_name}</span>
                        ) : history.error_message ? (
                          <span className="text-sm text-destructive truncate max-w-[200px] block">
                            {history.error_message}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(history.started_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ExportDownloadDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        exportConfig={selectedExportForDownload}
      />

      <ScheduleExportDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        exportConfig={selectedExportForSchedule}
        onSchedule={handleScheduleConfirm}
      />

      <EditScheduleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        schedule={selectedScheduleForEdit}
        onSave={handleSaveScheduleEdit}
      />

      <AlertDialog open={deleteScheduleDialogOpen} onOpenChange={setDeleteScheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled export for "{scheduleToDelete?.saved_exports?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSchedule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduledExports;
