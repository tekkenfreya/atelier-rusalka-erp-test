import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Trash2, Calculator, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PHASES = ["A", "B", "C", "D", "E"];
const BOTTLE_SIZES = [30, 50, 70, 100, 125, 150];

export interface ProductIngredientRow {
  id: string;
  phase: string;
  percentage: string;
  ingredient_id: string;
  ingredient_name: string;
  inci_name: string;
  function: string;
  supplier_name: string;
}

interface Ingredient {
  id: string;
  name: string;
  scientific_name: string | null;
  function: string | null;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
}

interface ProductIngredientsTableProps {
  ingredients: ProductIngredientRow[];
  onChange: (ingredients: ProductIngredientRow[]) => void;
}

export const ProductIngredientsTable = ({
  ingredients,
  onChange,
}: ProductIngredientsTableProps) => {
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [selectedBottleSize, setSelectedBottleSize] = useState<number>(50);
  const [openCombobox, setOpenCombobox] = useState<string | null>(null);
  

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const { data } = await supabase
      .from("ingredients")
      .select("id, name, scientific_name, function, supplier_id, suppliers(name)")
      .order("name");
    if (data) setAvailableIngredients(data as Ingredient[]);
  };

  const addRow = () => {
    const newRow: ProductIngredientRow = {
      id: crypto.randomUUID(),
      phase: "A",
      percentage: "",
      ingredient_id: "",
      ingredient_name: "",
      inci_name: "",
      function: "",
      supplier_name: "",
    };
    onChange([...ingredients, newRow]);
  };

  const removeRow = (id: string) => {
    onChange(ingredients.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof ProductIngredientRow, value: string | number) => {
    onChange(
      ingredients.map((row) => {
        if (row.id !== id) return row;

        if (field === "ingredient_id") {
          const ingredient = availableIngredients.find((i) => i.id === value);
          if (ingredient) {
            return {
              ...row,
              ingredient_id: value as string,
              ingredient_name: ingredient.name,
              inci_name: ingredient.scientific_name || "",
              function: ingredient.function || "",
              supplier_name: ingredient.suppliers?.name || "",
            };
          }
        }

        return { ...row, [field]: value };
      })
    );
  };

  // Calculate total, skipping non-numeric values
  const totalPercentage = ingredients.reduce((sum, row) => {
    const parsed = parseFloat(String(row.percentage).replace(",", "."));
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  // Find duplicates: same ingredient_id AND same phase
  const getDuplicateKeys = () => {
    const seen = new Map<string, string[]>();
    ingredients.forEach((row) => {
      if (!row.ingredient_id) return;
      const key = `${row.ingredient_id}-${row.phase}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(row.id);
    });
    
    const duplicateRowIds = new Set<string>();
    seen.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => duplicateRowIds.add(id));
      }
    });
    return duplicateRowIds;
  };

  const duplicateRowIds = getDuplicateKeys();

  const calculateAmount = (percentage: string | number) => {
    const parsed = parseFloat(String(percentage).replace(",", "."));
    if (isNaN(parsed)) return "—";
    return ((parsed / 100) * selectedBottleSize).toFixed(2);
  };

  const handlePercentageChange = (id: string, value: string) => {
    // Allow any text input - update directly
    updateRow(id, "percentage", value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Product Ingredients</CardTitle>
            <Button type="button" onClick={addRow} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Phase</TableHead>
                  <TableHead className="w-[100px]">%</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>INCI Name</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No ingredients added yet. Click "Add Ingredient" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((row) => {
                    const isDuplicate = duplicateRowIds.has(row.id);
                    return (
                    <TableRow 
                      key={row.id}
                      className={isDuplicate ? "bg-destructive/10 border-l-4 border-l-destructive" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isDuplicate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Duplicate ingredient in same phase</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Select
                            value={row.phase}
                            onValueChange={(value) => updateRow(row.id, "phase", value)}
                          >
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PHASES.map((phase) => (
                                <SelectItem key={phase} value={phase}>
                                  {phase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.percentage}
                          onChange={(e) => handlePercentageChange(row.id, e.target.value)}
                          className="w-[80px]"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover 
                          open={openCombobox === row.id} 
                          onOpenChange={(open) => setOpenCombobox(open ? row.id : null)}
                        >
                        <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCombobox === row.id}
                              className="w-[200px] justify-between font-normal overflow-hidden"
                            >
                              <span className="truncate">
                                {row.ingredient_id
                                  ? availableIngredients.find((ing) => ing.id === row.ingredient_id)?.name || "Select..."
                                  : "Select ingredient..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search ingredient..." />
                              <CommandList>
                                <CommandEmpty>No ingredient found.</CommandEmpty>
                                <CommandGroup>
                                  {availableIngredients.map((ing) => (
                                    <CommandItem
                                      key={ing.id}
                                      value={ing.name}
                                      onSelect={() => {
                                        updateRow(row.id, "ingredient_id", ing.id);
                                        setOpenCombobox(null);
                                      }}
                                      className="truncate"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          row.ingredient_id === ing.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">{ing.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.inci_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.function || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.supplier_name || "-"}
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
                    );
                  })
                )}
              </TableBody>
              {ingredients.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell
                      className={`font-bold ${
                        Math.abs(totalPercentage - 100) < 0.01
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {totalPercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell colSpan={5}></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {ingredients.length > 0 && (
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
                    {ingredients.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.ingredient_name || "Not selected"}</TableCell>
                        <TableCell>{row.percentage}{row.percentage && !isNaN(parseFloat(String(row.percentage).replace(",", "."))) ? "%" : ""}</TableCell>
                        <TableCell className="font-medium">
                          {calculateAmount(row.percentage) !== "—" ? `${calculateAmount(row.percentage)} ml` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell>{totalPercentage.toFixed(2)}%</TableCell>
                      <TableCell className="font-bold">
                        {calculateAmount(totalPercentage.toString())} ml
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
