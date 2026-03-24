import { useState } from "react";
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
import { FileSpreadsheet, FileText, FileCode } from "lucide-react";
import { SavedExport } from "./NewExportDialog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportConfig: SavedExport | null;
}

const FIELD_LABELS: Record<string, string> = {
  ingredient: "Ingredient",
  products: "Products",
  moisturizer: "Moisturizer",
  cleanser: "Cleanser",
  serum: "Serum",
  foamingShowerGel: "Foaming Shower Gel",
  other: "Other",
  needed: "Needed",
  ordered: "Ordered",
  stock: "Stock",
};

const ExportDownloadDialog = ({
  open,
  onOpenChange,
  exportConfig,
}: ExportDownloadDialogProps) => {
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | "csv-utf8">("excel");
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchProcurementData = async () => {
    // Fetch ingredients with products for procurement data
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("id, name, quantity_unit, amount_in_stock, last_order_quantity, supplier_id")
      .order("name");

    if (ingredientsError) throw ingredientsError;

    // For each ingredient, fetch the products it appears in
    const ingredientsWithProducts = await Promise.all(
      (ingredients || []).map(async (ingredient) => {
        const { data: productIngredients } = await supabase
          .from("product_ingredients")
          .select(`
            percentage,
            product_id,
            products:product_id (
              id,
              name,
              category
            )
          `)
          .eq("ingredient_id", ingredient.id);

        const products = (productIngredients || [])
          .map((pi: any) => ({
            id: pi.products?.id,
            name: pi.products?.name,
            category: pi.products?.category,
            percentage: pi.percentage,
          }))
          .filter((p: any) => p.id);

        const categoryBreakdown = {
          Moisturizer: 0,
          Cleanser: 0,
          Serum: 0,
          "Foaming Shower Gel": 0,
          Other: 0,
        };

        products.forEach((product: any) => {
          const category = product.category;
          if (category === "Moisturizer") categoryBreakdown.Moisturizer++;
          else if (category === "Cleanser") categoryBreakdown.Cleanser++;
          else if (category === "Serum") categoryBreakdown.Serum++;
          else if (category === "Foaming Shower Gel") categoryBreakdown["Foaming Shower Gel"]++;
          else categoryBreakdown.Other++;
        });

        return {
          id: ingredient.id,
          name: ingredient.name,
          quantityUnit: ingredient.quantity_unit,
          amountInStock: ingredient.amount_in_stock,
          lastOrderQuantity: ingredient.last_order_quantity,
          products,
          categoryBreakdown,
        };
      })
    );

    return ingredientsWithProducts;
  };

  const getFieldValue = (item: any, field: string): string => {
    switch (field) {
      case "ingredient":
        return item.name || "";
      case "products":
        return item.products?.map((p: any) => p.name).join(", ") || "";
      case "moisturizer":
        return item.categoryBreakdown?.Moisturizer?.toString() || "0";
      case "cleanser":
        return item.categoryBreakdown?.Cleanser?.toString() || "0";
      case "serum":
        return item.categoryBreakdown?.Serum?.toString() || "0";
      case "foamingShowerGel":
        return item.categoryBreakdown?.["Foaming Shower Gel"]?.toString() || "0";
      case "other":
        return item.categoryBreakdown?.Other?.toString() || "0";
      case "needed":
        return "—"; // Would need calculation config
      case "ordered":
        return item.lastOrderQuantity?.toString() || "—";
      case "stock":
        return item.amountInStock?.toString() || "0";
      default:
        return "";
    }
  };

  const generateFileName = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `${exportConfig?.name || "Export"}_${timestamp}`;
  };

  const handleDownload = async () => {
    if (!exportConfig) return;

    setIsDownloading(true);
    try {
      const data = await fetchProcurementData();
      const headers = exportConfig.fields.map((f) => FIELD_LABELS[f] || f);
      const rows = data.map((item) =>
        exportConfig.fields.map((field) => getFieldValue(item, field))
      );

      const fileName = generateFileName();

      if (format === "excel") {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else if (format === "csv" || format === "csv-utf8") {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        
        let blob: Blob;
        let extension: string;
        
        if (format === "csv-utf8") {
          // UTF-8 with BOM for proper encoding in Excel
          const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
          blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8" });
          extension = "csv";
        } else {
          blob = new Blob([csvContent], { type: "text/csv" });
          extension = "csv";
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(exportConfig.name, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 28,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        doc.save(`${fileName}.pdf`);
      }

      const formatLabel = format === "csv-utf8" ? "CSV (UTF-8)" : format.toUpperCase();
      toast.success(`${exportConfig.name} downloaded as ${formatLabel}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error downloading export:", error);
      toast.error("Failed to download export");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Export</DialogTitle>
          <DialogDescription>
            Choose the format for "{exportConfig?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">Export Format</Label>
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as "excel" | "pdf" | "csv" | "csv-utf8")}
            className="grid grid-cols-2 gap-4"
          >
            <div className="relative">
              <RadioGroupItem
                value="excel"
                id="format-excel"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-excel"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <FileSpreadsheet className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Excel</span>
                <span className="text-xs text-muted-foreground">.xlsx</span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem
                value="pdf"
                id="format-pdf"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-pdf"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <FileText className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">PDF</span>
                <span className="text-xs text-muted-foreground">.pdf</span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem
                value="csv"
                id="format-csv"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-csv"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <FileCode className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">CSV</span>
                <span className="text-xs text-muted-foreground">.csv</span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem
                value="csv-utf8"
                id="format-csv-utf8"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-csv-utf8"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <FileCode className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">CSV (UTF-8)</span>
                <span className="text-xs text-muted-foreground">.csv with BOM</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDownloadDialog;
