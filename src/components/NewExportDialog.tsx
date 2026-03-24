import { useState, useEffect } from "react";
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
import { Download } from "lucide-react";
import { BatchConfigEditor, BatchConfig, DEFAULT_BATCH_CONFIG } from "./BatchConfigEditor";

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

export interface SavedExport {
  id: string;
  name: string;
  type: "procurement" | "products" | "ingredients";
  fields: string[];
  batchConfig?: BatchConfig | null;
  createdAt: Date;
}

interface NewExportDialogProps {
  onSave: (exportConfig: Omit<SavedExport, "id" | "name" | "createdAt">) => void;
  trigger?: React.ReactNode;
}

export type { BatchConfig } from "./BatchConfigEditor";

const NewExportDialog = ({ onSave, trigger }: NewExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);

  const isNeededSelected = selectedFields.includes("needed");

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
    if (exportType === "procurement" && selectedFields.length > 0) {
      onSave({
        type: "procurement",
        fields: selectedFields,
        batchConfig: isNeededSelected ? batchConfig : null,
      });
      setOpen(false);
      setExportType("");
      setSelectedFields([]);
      setBatchConfig(DEFAULT_BATCH_CONFIG);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setExportType("");
      setSelectedFields([]);
      setBatchConfig(DEFAULT_BATCH_CONFIG);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            New Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Export</DialogTitle>
          <DialogDescription>
            Select the data type and fields you want to include in your export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Export Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select what to export..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="procurement">Procurement</SelectItem>
                <SelectItem value="products" disabled>
                  Products (coming soon)
                </SelectItem>
                <SelectItem value="ingredients" disabled>
                  Ingredients (coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportType === "procurement" && (
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
                      id={field.key}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <Label
                      htmlFor={field.key}
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

              {/* Batch Config Editor - shown when "Needed" is selected */}
              {isNeededSelected && (
                <BatchConfigEditor
                  config={batchConfig}
                  onChange={setBatchConfig}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!exportType || selectedFields.length === 0}
          >
            Save Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewExportDialog;
