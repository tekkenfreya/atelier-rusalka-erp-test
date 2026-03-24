import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Supplier {
  id: string;
  name: string;
}

interface ExtractDialogProps {
  ingredients: any[];
  suppliers: Supplier[];
}

const AVAILABLE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "scientific_name", label: "Scientific Name" },
  { key: "ingredient_id", label: "Ingredient ID" },
  { key: "type", label: "Type" },
  { key: "function", label: "Function" },
  { key: "supplier", label: "Supplier" },
  { key: "amount_in_stock", label: "Amount in Stock" },
  { key: "quantity_unit", label: "Quantity Unit" },
  { key: "last_order_date", label: "Last Order Date" },
  { key: "last_order_quantity", label: "Last Order Quantity" },
  { key: "life_expectancy", label: "Life Expectancy" },
  { key: "other_suppliers", label: "Other Suppliers" },
  { key: "comments", label: "Comments" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
];

const ExtractDialog = ({ ingredients, suppliers }: ExtractDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "name",
    "type",
    "ingredient_id",
    "function",
    "supplier",
    "amount_in_stock",
    "last_order_date",
  ]);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const filteredIngredients = useMemo(() => {
    if (supplierFilter === "all") return ingredients;
    return ingredients.filter((ing) => ing.supplier_id === supplierFilter);
  }, [ingredients, supplierFilter]);

  const getFieldValue = (ingredient: any, key: string): string => {
    switch (key) {
      case "supplier":
        return ingredient.supplier?.name || "—";
      case "last_order_date":
        return ingredient.last_order_date
          ? format(new Date(ingredient.last_order_date), "MMM d, yyyy")
          : "—";
      case "created_at":
        return ingredient.created_at
          ? format(new Date(ingredient.created_at), "MMM d, yyyy")
          : "—";
      case "updated_at":
        return ingredient.updated_at
          ? format(new Date(ingredient.updated_at), "MMM d, yyyy")
          : "—";
      case "amount_in_stock":
        return `${ingredient.amount_in_stock || 0} ${ingredient.quantity_unit || "g"}`;
      default:
        return ingredient[key] || "—";
    }
  };

  const generateFileName = () => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd_HH-mm");
    return `Extract_${dateStr}`;
  };

  const handleExport = () => {
    const data = filteredIngredients.map((ingredient) => {
      const row: Record<string, string> = {};
      selectedFields.forEach((key) => {
        const field = AVAILABLE_FIELDS.find((f) => f.key === key);
        if (field) {
          row[field.label] = getFieldValue(ingredient, key);
        }
      });
      return row;
    });

    const fileName = generateFileName();

    if (exportFormat === "excel") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ingredients");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const doc = new jsPDF();
      const headers = selectedFields
        .map((key) => AVAILABLE_FIELDS.find((f) => f.key === key)?.label || key);
      const rows = data.map((row) => Object.values(row));

      doc.setFontSize(16);
      doc.text("Ingredients Extract", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, 14, 28);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`${fileName}.pdf`);
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Extract
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Extract Ingredients</DialogTitle>
          <DialogDescription>
            Choose which fields to include and the export format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fields Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fields to Include</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
              {AVAILABLE_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <label
                    htmlFor={field.key}
                    className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Export Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(value: "excel" | "pdf") => setExportFormat(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by Supplier</Label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue />
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

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {filteredIngredients.length} ingredient(s) will be exported with{" "}
            {selectedFields.length} field(s).
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedFields.length === 0 || filteredIngredients.length === 0}
          >
            Create Extract
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractDialog;
