import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BatchConfig, DEFAULT_BATCH_CONFIG, BatchConfigEditor } from "@/components/BatchConfigEditor";

interface ReportSubscription {
  id: string;
  report_type: string;
  email: string;
  frequency: string;
  scheduled_hour: number;
  is_active: boolean;
  include_batch_config: boolean;
  batch_config: unknown;
  filter_supplier_id: string | null;
}

interface EditSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: ReportSubscription;
}

export const EditSubscriptionDialog = ({
  open,
  onOpenChange,
  subscription,
}: EditSubscriptionDialogProps) => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(subscription.email);
  const [frequency, setFrequency] = useState(subscription.frequency);
  const [scheduledHour, setScheduledHour] = useState(subscription.scheduled_hour.toString());
  const [isActive, setIsActive] = useState(subscription.is_active);
  const [includeBatchConfig, setIncludeBatchConfig] = useState(subscription.include_batch_config);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(
    (subscription.batch_config as BatchConfig) || DEFAULT_BATCH_CONFIG
  );
  const [filterSupplierId, setFilterSupplierId] = useState(subscription.filter_supplier_id || "all");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setEmail(subscription.email);
    setFrequency(subscription.frequency);
    setScheduledHour(subscription.scheduled_hour.toString());
    setIsActive(subscription.is_active);
    setIncludeBatchConfig(subscription.include_batch_config);
    setBatchConfig((subscription.batch_config as BatchConfig) || DEFAULT_BATCH_CONFIG);
    setFilterSupplierId(subscription.filter_supplier_id || "all");
  }, [subscription]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("report_subscriptions")
        .update({
          email,
          frequency,
          scheduled_hour: parseInt(scheduledHour),
          is_active: isActive,
          include_batch_config: includeBatchConfig,
          batch_config: includeBatchConfig ? JSON.parse(JSON.stringify(batchConfig)) : null,
          filter_supplier_id: filterSupplierId === "all" ? null : filterSupplierId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      toast.success("Subscription updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update subscription: " + error.message);
    },
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update your report subscription settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Active</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled-hour">Delivery Time (Local)</Label>
            <Select value={scheduledHour} onValueChange={setScheduledHour}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {formatHour(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-filter">Filter by Supplier</Label>
            <Select value={filterSupplierId} onValueChange={setFilterSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-batch-config">Include Batch Configuration</Label>
            <Switch
              id="include-batch-config"
              checked={includeBatchConfig}
              onCheckedChange={setIncludeBatchConfig}
            />
          </div>

          {includeBatchConfig && (
            <div className="pt-2">
              <BatchConfigEditor config={batchConfig} onChange={setBatchConfig} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
