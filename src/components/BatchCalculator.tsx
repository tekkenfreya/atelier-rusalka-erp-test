import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator } from "lucide-react";

const BOTTLE_SIZES = [30, 50, 70, 100, 125, 150, 200];

interface Ingredient {
  name: string;
  percentage: string | number;
}

interface BatchCalculatorProps {
  ingredients: Ingredient[];
}

export const BatchCalculator = ({ ingredients }: BatchCalculatorProps) => {
  const [selectedBottleSize, setSelectedBottleSize] = useState<number>(50);

  const parsePercentage = (value: string | number): number => {
    const parsed = parseFloat(String(value).replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalPercentage = ingredients.reduce((sum, ing) => sum + parsePercentage(ing.percentage), 0);

  const calculateAmount = (percentage: string | number) => {
    const parsed = parsePercentage(percentage);
    if (parsed === 0 && String(percentage).trim() !== "0" && String(percentage).trim() !== "") {
      return "—";
    }
    return ((parsed / 100) * selectedBottleSize).toFixed(2);
  };

  if (ingredients.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <CardTitle className="text-lg">Batch Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Bottle Size:</label>
            <Select
              value={selectedBottleSize.toString()}
              onValueChange={(value) => setSelectedBottleSize(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOTTLE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} ml
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="w-[100px]">%</TableHead>
                  <TableHead className="w-[120px]">Amount (ml/g)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ing, index) => (
                  <TableRow key={index}>
                    <TableCell>{ing.name || "Not selected"}</TableCell>
                    <TableCell>{ing.percentage}{parsePercentage(ing.percentage) > 0 || String(ing.percentage).trim() === "0" ? "%" : ""}</TableCell>
                    <TableCell className="font-medium">
                      {calculateAmount(ing.percentage) !== "—" ? `${calculateAmount(ing.percentage)} ml` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell>{totalPercentage.toFixed(2)}%</TableCell>
                  <TableCell className="font-bold">
                    {calculateAmount(totalPercentage)} ml
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
