import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MethodStepRow {
  id: string;
  step_number: string;
  step_type: "step" | "notes";
  content: string;
  sort_order: number;
}

interface ProductMethodTableProps {
  steps: MethodStepRow[];
  onChange: (steps: MethodStepRow[]) => void;
}

export const ProductMethodTable = ({
  steps,
  onChange,
}: ProductMethodTableProps) => {
  const getNextStepNumber = () => {
    const stepNumbers = steps
      .filter((s) => s.step_type === "step")
      .map((s) => {
        const match = s.step_number.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxStep = stepNumbers.length > 0 ? Math.max(...stepNumbers) : 0;
    return (maxStep + 1).toString();
  };

  const addRow = (type: "step" | "notes" = "step") => {
    const newRow: MethodStepRow = {
      id: crypto.randomUUID(),
      step_number: type === "step" ? getNextStepNumber() : "",
      step_type: type,
      content: "",
      sort_order: steps.length,
    };
    onChange([...steps, newRow]);
  };

  const removeRow = (id: string) => {
    const updatedSteps = steps
      .filter((row) => row.id !== id)
      .map((row, index) => ({ ...row, sort_order: index }));
    onChange(updatedSteps);
  };

  const updateRow = (id: string, field: keyof MethodStepRow, value: string) => {
    onChange(
      steps.map((row) => {
        if (row.id !== id) return row;
        
        // If changing type, update step_number accordingly
        if (field === "step_type") {
          const newType = value as "step" | "notes";
          return {
            ...row,
            step_type: newType,
            step_number: newType === "notes" ? "" : row.step_number || getNextStepNumber(),
          };
        }
        
        return { ...row, [field]: value };
      })
    );
  };

  const moveRow = (id: string, direction: "up" | "down") => {
    const index = steps.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    onChange(newSteps.map((step, i) => ({ ...step, sort_order: i })));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Method</CardTitle>
          <div className="flex gap-2">
            <Button type="button" onClick={() => addRow("step")} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
            <Button type="button" onClick={() => addRow("notes")} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Notes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[100px]">Step #</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No method steps added yet. Click "Add Step" to start.
                  </TableCell>
                </TableRow>
              ) : (
                steps.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveRow(row.id, "up")}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.step_type}
                        onValueChange={(value) => updateRow(row.id, "step_type", value)}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="step">Step</SelectItem>
                          <SelectItem value="notes">Notes</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {row.step_type === "step" ? (
                        <Input
                          value={row.step_number}
                          onChange={(e) => updateRow(row.id, "step_number", e.target.value)}
                          className="w-[80px]"
                          placeholder="1, 1a..."
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={row.content}
                        onChange={(e) => updateRow(row.id, "content", e.target.value)}
                        placeholder={row.step_type === "step" ? "Describe this step..." : "Add notes..."}
                        className="min-h-[60px] resize-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
