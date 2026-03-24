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
import { Calendar, Mail, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BatchConfig, BatchConfigEditor, DEFAULT_BATCH_CONFIG } from "@/components/BatchConfigEditor";

interface SubscribeReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  reportTitle: string;
  currentBatchConfig?: BatchConfig;
  currentFilterSupplier?: string;
}

interface Supplier {
  id: string;
  name: string;
}

const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
};

export const SubscribeReportDialog = ({
  open,
  onOpenChange,
  reportType,
  reportTitle,
  currentBatchConfig,
  currentFilterSupplier,
}: SubscribeReportDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduledHour, setScheduledHour] = useState<number>(9);
  const [email, setEmail] = useState("");
  const [includeBatchConfig, setIncludeBatchConfig] = useState(true);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(currentBatchConfig || DEFAULT_BATCH_CONFIG);
  const [filterSupplier, setFilterSupplier] = useState<string>(currentFilterSupplier || "all");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: fetchSuppliers,
    enabled: open,
  });

  // Generate hour options (0-23) with local time display
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setHours(i, 0, 0, 0);
    return {
      value: i,
      label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFrequency("weekly");
      setScheduledHour(9);
      setEmail(user?.email || "");
      setIncludeBatchConfig(true);
      setBatchConfig(currentBatchConfig || DEFAULT_BATCH_CONFIG);
      setFilterSupplier(currentFilterSupplier || "all");
    }
  }, [open, user?.email, currentBatchConfig, currentFilterSupplier]);

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // Calculate initial next_run_at
      const now = new Date();
      let nextRunAt = new Date(now);
      nextRunAt.setHours(scheduledHour, 0, 0, 0);
      
      if (nextRunAt <= now) {
        switch (frequency) {
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

      const { error } = await supabase.from("report_subscriptions").insert({
        user_id: user?.id,
        report_type: reportType,
        frequency,
        scheduled_hour: scheduledHour,
        email,
        include_batch_config: includeBatchConfig,
        batch_config: includeBatchConfig ? JSON.parse(JSON.stringify(batchConfig)) : null,
        filter_supplier_id: filterSupplier !== "all" ? filterSupplier : null,
        next_run_at: nextRunAt.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-subscriptions"] });
      toast.success("Report subscription created successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Subscription error:", error);
      toast.error("Failed to create subscription");
    },
  });

  const handleSubscribe = () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    createSubscriptionMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Subscribe to Report
          </DialogTitle>
          <DialogDescription>
            Configure automated email delivery for "{reportTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email Address</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The report will be sent to this email as a PDF with the chart embedded
            </p>
          </div>

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
                  id="sub-daily"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="sub-daily"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Daily</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="weekly"
                  id="sub-weekly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="sub-weekly"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Weekly</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="monthly"
                  id="sub-monthly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="sub-monthly"
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
              Report will be generated and sent at this time (your local time)
            </p>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by Supplier</Label>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include Batch Config */}
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Include Batch Configuration</Label>
              <p className="text-xs text-muted-foreground">
                Customize volumes and quantities for "Needed" calculations
              </p>
            </div>
            <Switch
              checked={includeBatchConfig}
              onCheckedChange={setIncludeBatchConfig}
            />
          </div>

          {/* Batch Config Editor (if enabled) */}
          {includeBatchConfig && (
            <BatchConfigEditor config={batchConfig} onChange={setBatchConfig} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubscribe} 
            disabled={createSubscriptionMutation.isPending}
          >
            {createSubscriptionMutation.isPending ? "Creating..." : "Subscribe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscribeReportDialog;
