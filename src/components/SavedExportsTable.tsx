import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Trash2 } from "lucide-react";
import { SavedExport } from "./NewExportDialog";
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

interface SavedExportsTableProps {
  exports: SavedExport[];
  onDownload: (exportConfig: SavedExport) => void;
  onSchedule: (exportConfig: SavedExport) => void;
  onDelete: (id: string) => void;
}

const SavedExportsTable = ({
  exports,
  onDownload,
  onSchedule,
  onDelete,
}: SavedExportsTableProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportToDelete, setExportToDelete] = useState<SavedExport | null>(null);

  const getFieldLabels = (fields: string[]) => {
    const fieldMap: Record<string, string> = {
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
    return fields.map((f) => fieldMap[f] || f).join(", ");
  };

  const handleDeleteClick = (exp: SavedExport) => {
    setExportToDelete(exp);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (exportToDelete) {
      onDelete(exportToDelete.id);
    }
    setDeleteDialogOpen(false);
    setExportToDelete(null);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Fields</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No saved exports yet. Create one using "New Export".
                </TableCell>
              </TableRow>
            ) : (
              exports.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.name}</TableCell>
                  <TableCell className="capitalize">{exp.type}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate" title={getFieldLabels(exp.fields)}>
                    {getFieldLabels(exp.fields)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(exp.createdAt, "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(exp)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSchedule(exp)}
                        title="Schedule"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(exp)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Export</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{exportToDelete?.name}"? This action cannot be undone and will also remove any associated scheduled exports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedExportsTable;
