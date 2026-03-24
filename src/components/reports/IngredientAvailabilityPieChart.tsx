import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BatchConfig } from "@/components/BatchConfigEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProductWithPercentage {
  category: string | null;
  percentage: string;
}

interface IngredientData {
  id: string;
  name: string;
  amountInStock: number;
  lastOrderQuantity: number;
  supplierId: string | null;
  products: ProductWithPercentage[];
}

interface Supplier {
  id: string;
  name: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  stock: number;
  ordered: number;
  needed: number;
  statusPriority: number; // For sorting by status
}

type SortOption = "status" | "alphabetical";

// Color definitions with priority for sorting (lower = more critical)
const COLORS = {
  black: { hex: "hsl(0, 0%, 10%)", priority: 0 },
  darkRed: { hex: "hsl(0, 84%, 35%)", priority: 1 },
  red: { hex: "hsl(0, 84%, 60%)", priority: 2 },
  lightOrange: { hex: "hsl(25, 95%, 70%)", priority: 3 },
  orange: { hex: "hsl(25, 95%, 53%)", priority: 4 },
  lightGreen: { hex: "hsl(142, 76%, 56%)", priority: 5 },
  green: { hex: "hsl(142, 76%, 36%)", priority: 6 },
};

const parsePercentage = (value: string): number => {
  const parsed = parseFloat(String(value).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
};

const calculateTotalNeeded = (
  products: ProductWithPercentage[],
  config: BatchConfig
): number => {
  let total = 0;

  products.forEach((product) => {
    const percentage = parsePercentage(product.percentage);
    if (percentage === 0) return;

    const category = product.category;
    let volume = 0;
    let quantity = 0;

    if (category === "Moisturizer") {
      volume = config.moisturizerVolume;
      quantity = config.moisturizerQuantity;
    } else if (category === "Cleanser") {
      volume = config.cleanserVolume;
      quantity = config.cleanserQuantity;
    } else if (category === "Serum") {
      volume = config.serumVolume;
      quantity = config.serumQuantity;
    } else if (category === "Foaming Shower Gel") {
      volume = config.foamingShowerGelVolume;
      quantity = config.foamingShowerGelQuantity;
    }

    const amountForProduct = (percentage / 100) * volume * quantity;
    total += amountForProduct;
  });

  return total;
};

const getAvailabilityColor = (
  stock: number,
  ordered: number,
  needed: number
): { hex: string; priority: number } => {
  if (stock === 0 && ordered === 0) {
    return COLORS.black;
  }

  const total = stock + ordered;
  const hasOrdered = ordered > 0;

  if (hasOrdered) {
    if (total >= needed) {
      return COLORS.lightGreen;
    } else if (total > needed * 0.5) {
      return COLORS.lightOrange;
    } else {
      return COLORS.darkRed;
    }
  }

  if (stock >= needed) {
    return COLORS.green;
  } else if (stock > needed * 0.5) {
    return COLORS.orange;
  } else {
    return COLORS.red;
  }
};

const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
};

const fetchIngredientsWithProducts = async (): Promise<IngredientData[]> => {
  const { data: ingredients, error: ingredientsError } = await supabase
    .from("ingredients")
    .select("id, name, amount_in_stock, last_order_quantity, supplier_id")
    .order("name");

  if (ingredientsError) throw ingredientsError;

  const ingredientsWithProducts: IngredientData[] = await Promise.all(
    (ingredients || []).map(async (ingredient) => {
      const { data: productIngredients, error: piError } = await supabase
        .from("product_ingredients")
        .select(`
          percentage,
          products:product_id (
            category
          )
        `)
        .eq("ingredient_id", ingredient.id);

      if (piError) {
        console.error("Error fetching product ingredients:", piError);
        return {
          id: ingredient.id,
          name: ingredient.name,
          amountInStock: ingredient.amount_in_stock || 0,
          lastOrderQuantity: ingredient.last_order_quantity || 0,
          supplierId: ingredient.supplier_id,
          products: [],
        };
      }

      const products: ProductWithPercentage[] = (productIngredients || [])
        .map((pi: any) => ({
          category: pi.products?.category || null,
          percentage: pi.percentage,
        }))
        .filter((p: ProductWithPercentage) => p.category !== null);

      return {
        id: ingredient.id,
        name: ingredient.name,
        amountInStock: ingredient.amount_in_stock || 0,
        lastOrderQuantity: ingredient.last_order_quantity || 0,
        supplierId: ingredient.supplier_id,
        products,
      };
    })
  );

  return ingredientsWithProducts.filter((i) => i.products.length > 0);
};

interface IngredientAvailabilityPieChartProps {
  batchConfig: BatchConfig;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{data.name}</p>
        <p className="text-muted-foreground">Needed: {data.needed.toFixed(2)}</p>
        <p className="text-muted-foreground">In Stock: {data.stock.toFixed(2)}</p>
        <p className="text-muted-foreground">Ordered: {data.ordered.toFixed(2)}</p>
        <p className="text-muted-foreground">Total Available: {(data.stock + data.ordered).toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export const IngredientAvailabilityPieChart = ({
  batchConfig,
}: IngredientAvailabilityPieChartProps) => {
  const [sortBy, setSortBy] = useState<SortOption>("status");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: fetchSuppliers,
  });

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ["ingredients-with-products"],
    queryFn: fetchIngredientsWithProducts,
  });

  const chartData = useMemo<ChartDataItem[]>(() => {
    // Filter by supplier first
    const filteredIngredients = filterSupplier === "all"
      ? ingredients
      : ingredients.filter((i) => i.supplierId === filterSupplier);

    const data = filteredIngredients.map((ingredient) => {
      const needed = calculateTotalNeeded(ingredient.products, batchConfig);
      const stock = ingredient.amountInStock;
      const ordered = ingredient.lastOrderQuantity;
      const colorInfo = getAvailabilityColor(stock, ordered, needed);

      return {
        name: ingredient.name,
        value: 1,
        color: colorInfo.hex,
        stock,
        ordered,
        needed,
        statusPriority: colorInfo.priority,
      };
    });

    // Sort based on selected option
    if (sortBy === "status") {
      return data.sort((a, b) => a.statusPriority - b.statusPriority);
    } else {
      return data.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [ingredients, batchConfig, sortBy, filterSupplier]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingredient Availability</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const renderFilters = () => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Filter by</Label>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px] h-8">
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
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Order by</Label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Ingredient Availability</CardTitle>
          {renderFilters()}
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No ingredients found for the selected filter.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Ingredient Availability</CardTitle>
        {renderFilters()}
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={150}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.green.hex }} />
            <span>Stock ≥ Needed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.lightGreen.hex }} />
            <span>Stock+Ordered ≥ Needed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.orange.hex }} />
            <span>Stock &gt; 50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.lightOrange.hex }} />
            <span>Stock+Ordered &gt; 50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.red.hex }} />
            <span>Stock ≤ 50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.darkRed.hex }} />
            <span>Stock+Ordered ≤ 50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.black.hex }} />
            <span>No Stock/Orders</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IngredientAvailabilityPieChart;
