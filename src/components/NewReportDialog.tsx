import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const PROCUREMENT_FIELDS = [
  { key: "ingredient", label: "Ingredient" },
  { key: "products", label: "Products" },
  { key: "moisturizer", label: "Moisturizer" },
  { key: "cleanser", label: "Cleanser" },
  { key: "serum", label: "Serum" },
  { key: "foamingShowerGel", label: "Foaming Shower Gel" },
  { key: "other", label: "Other" },
  { key: "needed", label: "Needed" },
  { key: "ordered", label: "Ordered" },
  { key: "stock", label: "Stock" },
];

export interface SavedReport {
  id: string;
  name: string;
  type: "products" | "ingredients" | "procurement";
  fields?: string[];
  createdAt: Date;
}

interface NewReportDialogProps {
  onSave: (reportConfig: Omit<SavedReport, "id" | "name" | "createdAt">) => void;
  trigger?: React.ReactNode;
}

const NewReportDialog = ({ onSave, trigger }: NewReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedFields(PROCUREMENT_FIELDS.map((f) => f.key));
  };

  const deselectAll = () => {
    setSelectedFields([]);
  };

  const handleSave = () => {
    if (reportType) {
      onSave({
        type: reportType as "products" | "ingredients" | "procurement",
        fields: reportType === "procurement" ? selectedFields : undefined,
      });
      setOpen(false);
      setReportType("");
      setSelectedFields([]);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setReportType("");
      setSelectedFields([]);
    }
  };

  const canSave = () => {
    if (!reportType) return false;
    if (reportType === "procurement" && selectedFields.length === 0) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Select the type of report you want to generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(value) => {
              setReportType(value);
              setSelectedFields([]);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="ingredients">Ingredients</SelectItem>
                <SelectItem value="procurement">Procurement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "procurement" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Fields</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-md border p-4">
                {PROCUREMENT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`report-${field.key}`}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <Label
                      htmlFor={`report-${field.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedFields.length} field(s) selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave()}>
            Create Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewReportDialog;
