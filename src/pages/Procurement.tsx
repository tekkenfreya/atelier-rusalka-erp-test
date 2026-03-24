import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Calculator, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Volume and quantity options per category
const MOISTURIZER_VOLUMES = [30, 40, 50, 60, 70, 100];
const CLEANSER_VOLUMES = [50, 100, 120, 150, 170, 200, 250];
const SERUM_VOLUMES = [10, 15, 20, 25, 30, 40, 50, 70];
const FOAMING_SHOWER_GEL_VOLUMES = [100, 150, 200, 250, 300, 400, 500];
const QUANTITY_OPTIONS = [50, 100, 200, 500, 1000, 10000];

interface ProductWithPercentage {
  id: string;
  name: string;
  category: string | null;
  percentage: string;
}

interface IngredientWithProducts {
  id: string;
  name: string;
  quantityUnit: string | null;
  amountInStock: number | null;
  lastOrderQuantity: number | null;
  products: ProductWithPercentage[];
  categoryBreakdown: {
    Moisturizer: number;
    Cleanser: number;
    Serum: number;
    "Foaming Shower Gel": number;
    Other: number;
  };
}

const Procurement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [ingredientsWithProducts, setIngredientsWithProducts] = useState<IngredientWithProducts[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [orderAmounts, setOrderAmounts] = useState<Record<string, string>>({});
  const [lockedOrderAmounts, setLockedOrderAmounts] = useState<Set<string>>(new Set());
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  // Production configuration state (editing values)
  const [moisturizerVolume, setMoisturizerVolume] = useState(50);
  const [moisturizerQuantity, setMoisturizerQuantity] = useState(100);
  const [cleanserVolume, setCleanserVolume] = useState(150);
  const [cleanserQuantity, setCleanserQuantity] = useState(100);
  const [serumVolume, setSerumVolume] = useState(30);
  const [serumQuantity, setSerumQuantity] = useState(100);
  const [foamingShowerGelVolume, setFoamingShowerGelVolume] = useState(250);
  const [foamingShowerGelQuantity, setFoamingShowerGelQuantity] = useState(100);

  // Active configuration state (used for calculations after clicking Calculate)
  const [activeConfig, setActiveConfig] = useState({
    moisturizerVolume: 50,
    moisturizerQuantity: 100,
    cleanserVolume: 150,
    cleanserQuantity: 100,
    serumVolume: 30,
    serumQuantity: 100,
    foamingShowerGelVolume: 250,
    foamingShowerGelQuantity: 100,
  });

  const handleCalculate = () => {
    setActiveConfig({
      moisturizerVolume,
      moisturizerQuantity,
      cleanserVolume,
      cleanserQuantity,
      serumVolume,
      serumQuantity,
      foamingShowerGelVolume,
      foamingShowerGelQuantity,
    });
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchIngredientsBySupplier(selectedSupplierId);
    }
  }, [selectedSupplierId]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchIngredientsBySupplier = async (supplierId: string) => {
    setLoadingIngredients(true);
    try {
      // Fetch ingredients for the supplier with quantity_unit, amount_in_stock, and last_order_quantity
      let query = supabase
        .from("ingredients")
        .select("id, name, quantity_unit, amount_in_stock, last_order_quantity, supplier_id")
        .order("name");
      
      // If not "all", filter by supplier
      if (supplierId !== "all") {
        query = query.eq("supplier_id", supplierId);
      }
      
      const { data: ingredients, error: ingredientsError } = await query;

      if (ingredientsError) throw ingredientsError;

      // For each ingredient, fetch the products it appears in with percentage
      const ingredientsWithProductsData: IngredientWithProducts[] = await Promise.all(
        (ingredients || []).map(async (ingredient) => {
          const { data: productIngredients, error: piError } = await supabase
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

          if (piError) {
            console.error("Error fetching product ingredients:", piError);
            return {
              id: ingredient.id,
              name: ingredient.name,
              quantityUnit: ingredient.quantity_unit,
              amountInStock: ingredient.amount_in_stock,
              lastOrderQuantity: ingredient.last_order_quantity,
              products: [],
              categoryBreakdown: { Moisturizer: 0, Cleanser: 0, Serum: 0, "Foaming Shower Gel": 0, Other: 0 },
            };
          }

          const products: ProductWithPercentage[] = (productIngredients || [])
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

          products.forEach((product) => {
            const category = product.category;
            if (category === "Moisturizer") {
              categoryBreakdown.Moisturizer++;
            } else if (category === "Cleanser") {
              categoryBreakdown.Cleanser++;
            } else if (category === "Serum") {
              categoryBreakdown.Serum++;
            } else if (category === "Foaming Shower Gel") {
              categoryBreakdown["Foaming Shower Gel"]++;
            } else {
              categoryBreakdown.Other++;
            }
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

      setIngredientsWithProducts(ingredientsWithProductsData);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "Moisturizer":
        return "default";
      case "Cleanser":
        return "secondary";
      case "Serum":
        return "outline";
      default:
        return "outline";
    }
  };

  const parsePercentage = (value: string): number => {
    const parsed = parseFloat(String(value).replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateTotalNeeded = (ingredient: IngredientWithProducts): number => {
    let total = 0;

    ingredient.products.forEach((product) => {
      const percentage = parsePercentage(product.percentage);
      if (percentage === 0) return;

      const category = product.category;
      let volume = 0;
      let quantity = 0;

      if (category === "Moisturizer") {
        volume = activeConfig.moisturizerVolume;
        quantity = activeConfig.moisturizerQuantity;
      } else if (category === "Cleanser") {
        volume = activeConfig.cleanserVolume;
        quantity = activeConfig.cleanserQuantity;
      } else if (category === "Serum") {
        volume = activeConfig.serumVolume;
        quantity = activeConfig.serumQuantity;
      } else if (category === "Foaming Shower Gel") {
        volume = activeConfig.foamingShowerGelVolume;
        quantity = activeConfig.foamingShowerGelQuantity;
      }

      // Calculate: (percentage/100) * volume * quantity
      const amountForProduct = (percentage / 100) * volume * quantity;
      total += amountForProduct;
    });

    return total;
  };

  const getSelectedSupplierName = () => {
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    return supplier?.name || "";
  };

  const handleConfirmOrder = async () => {
    if (!user || !selectedSupplierId || selectedSupplierId === "all") {
      if (selectedSupplierId === "all") {
        toast({
          title: "Select a supplier",
          description: "Please select a specific supplier before confirming an order.",
          variant: "destructive",
        });
      }
      return;
    }

    const itemsToOrder = Array.from(lockedOrderAmounts)
      .filter((id) => {
        const amount = parseFloat(orderAmounts[id]?.replace(",", ".") || "0");
        return !isNaN(amount) && amount > 0;
      })
      .map((id) => ({
        ingredient_id: id,
        order_amount: parseFloat(orderAmounts[id]?.replace(",", ".") || "0"),
      }));

    if (itemsToOrder.length === 0) {
      toast({
        title: "No items to order",
        description: "Please save at least one ingredient with an order amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setConfirmingOrder(true);
    try {
      const supplierName = getSelectedSupplierName();

      // Get the next order number for this supplier
      const { data: existingOrders, error: countError } = await supabase
        .from("orders")
        .select("order_number")
        .ilike("order_number", `Order-${supplierName}-%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (countError) throw countError;

      let nextNumber = 1;
      if (existingOrders && existingOrders.length > 0) {
        const lastOrder = existingOrders[0].order_number;
        const match = lastOrder.match(/-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const orderNumber = `Order-${supplierName}-${String(nextNumber).padStart(5, "0")}`;

      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          supplier_id: selectedSupplierId,
          supplier_name: supplierName,
          user_id: user.id,
          user_email: user.email || "Unknown",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = itemsToOrder.map((item) => ({
        order_id: orderData.id,
        ingredient_id: item.ingredient_id,
        order_amount: item.order_amount,
        original_order_amount: item.order_amount,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update ingredient last_order_quantity (confirmed ordered amount)
      for (const item of itemsToOrder) {
        const { error: updateError } = await supabase
          .from("ingredients")
          .update({ 
            last_order_quantity: item.order_amount,
            last_order_date: new Date().toISOString().split('T')[0]
          })
          .eq("id", item.ingredient_id);

        if (updateError) {
          console.error("Error updating confirmed ordered amount for ingredient:", item.ingredient_id, updateError);
        }
      }

      toast({
        title: "Order confirmed",
        description: `${orderNumber} created with ${itemsToOrder.length} item(s).`,
      });

      // Refresh ingredients data to show updated stock
      await fetchIngredientsBySupplier(selectedSupplierId);

      // Reset state
      setSelectedIngredients(new Set());
      setOrderAmounts({});
      setLockedOrderAmounts(new Set());
    } catch (error) {
      console.error("Error confirming order:", error);
      toast({
        title: "Error",
        description: "Failed to confirm order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procurement</h1>
          <Link
            to="/order-log"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            <ClipboardList className="h-4 w-4" />
            View Order Log
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Supplier Ingredients & Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-sm">
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Supplier
            </Label>
            {loadingSuppliers ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier..." />
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
            )}
          </div>

          {/* Production Configuration Parameters */}
          {selectedSupplierId && (
            <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
              {/* Moisturizer Configuration */}
              <div className="space-y-1">
                <Label className="font-medium text-sm">Moisturizer</Label>
                <div className="flex items-center gap-1">
                  <Select
                    value={moisturizerVolume.toString()}
                    onValueChange={(v) => setMoisturizerVolume(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOISTURIZER_VOLUMES.map((vol) => (
                        <SelectItem key={vol} value={vol.toString()}>
                          {vol} ml
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">×</span>
                  <Select
                    value={moisturizerQuantity.toString()}
                    onValueChange={(v) => setMoisturizerQuantity(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((qty) => (
                        <SelectItem key={qty} value={qty.toString()}>
                          {qty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cleanser Configuration */}
              <div className="space-y-1">
                <Label className="font-medium text-sm">Cleanser</Label>
                <div className="flex items-center gap-1">
                  <Select
                    value={cleanserVolume.toString()}
                    onValueChange={(v) => setCleanserVolume(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLEANSER_VOLUMES.map((vol) => (
                        <SelectItem key={vol} value={vol.toString()}>
                          {vol} ml
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">×</span>
                  <Select
                    value={cleanserQuantity.toString()}
                    onValueChange={(v) => setCleanserQuantity(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((qty) => (
                        <SelectItem key={qty} value={qty.toString()}>
                          {qty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Serum Configuration */}
              <div className="space-y-1">
                <Label className="font-medium text-sm">Serum</Label>
                <div className="flex items-center gap-1">
                  <Select
                    value={serumVolume.toString()}
                    onValueChange={(v) => setSerumVolume(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERUM_VOLUMES.map((vol) => (
                        <SelectItem key={vol} value={vol.toString()}>
                          {vol} ml
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">×</span>
                  <Select
                    value={serumQuantity.toString()}
                    onValueChange={(v) => setSerumQuantity(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((qty) => (
                        <SelectItem key={qty} value={qty.toString()}>
                          {qty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Foaming Shower Gel Configuration */}
              <div className="space-y-1">
                <Label className="font-medium text-sm">Shower Gel</Label>
                <div className="flex items-center gap-1">
                  <Select
                    value={foamingShowerGelVolume.toString()}
                    onValueChange={(v) => setFoamingShowerGelVolume(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOAMING_SHOWER_GEL_VOLUMES.map((vol) => (
                        <SelectItem key={vol} value={vol.toString()}>
                          {vol} ml
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">×</span>
                  <Select
                    value={foamingShowerGelQuantity.toString()}
                    onValueChange={(v) => setFoamingShowerGelQuantity(parseInt(v))}
                  >
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((qty) => (
                        <SelectItem key={qty} value={qty.toString()}>
                          {qty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="ml-auto">
                <Button onClick={handleCalculate} className="gap-2 h-9">
                  <Calculator className="h-4 w-4" />
                  Calculate
                </Button>
              </div>
            </div>
          )}

          {/* Order Summary */}
          {selectedSupplierId && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {Array.from(lockedOrderAmounts).filter(id => {
                    const amount = parseFloat(orderAmounts[id]?.replace(',', '.') || '0');
                    return !isNaN(amount) && amount > 0;
                  }).length}
                </span>
                {" "}ingredient(s) with saved order amounts
              </span>
              <Button 
                className="gap-2" 
                onClick={handleConfirmOrder}
                disabled={confirmingOrder}
              >
                {confirmingOrder ? "Confirming..." : "Confirm Order"}
              </Button>
            </div>
          )}

          {selectedSupplierId && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[120px]">Ingredient</TableHead>
                    <TableHead className="min-w-[100px]">Products</TableHead>
                    <TableHead className="text-center w-12" title="Moisturizer">Moist.</TableHead>
                    <TableHead className="text-center w-12" title="Cleanser">Clean.</TableHead>
                    <TableHead className="text-center w-12" title="Serum">Serum</TableHead>
                    <TableHead className="text-center w-12" title="Foaming Shower Gel">S. Gel</TableHead>
                    <TableHead className="text-center w-12">Other</TableHead>
                    <TableHead className="text-right w-20">Needed</TableHead>
                    <TableHead className="text-right w-20" title="Confirmed Ordered Amount">Ordered</TableHead>
                    <TableHead className="text-right w-16">Stock</TableHead>
                    <TableHead className="text-right w-24">Order Amt</TableHead>
                    <TableHead className="text-center w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingIngredients ? (
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={13}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : ingredientsWithProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                        No ingredients found for this supplier.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ingredientsWithProducts.map((ingredient) => {
                      const totalNeeded = calculateTotalNeeded(ingredient);
                      const unit = ingredient.quantityUnit || "g";
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIngredients.has(ingredient.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedIngredients);
                                if (checked) {
                                  newSelected.add(ingredient.id);
                                } else {
                                  newSelected.delete(ingredient.id);
                                  // Reset locked state and order amount when unchecked
                                  const newLocked = new Set(lockedOrderAmounts);
                                  newLocked.delete(ingredient.id);
                                  setLockedOrderAmounts(newLocked);
                                  setOrderAmounts(prev => {
                                    const updated = { ...prev };
                                    delete updated[ingredient.id];
                                    return updated;
                                  });
                                }
                                setSelectedIngredients(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              to={`/ingredients/${ingredient.id}`}
                              className="text-primary hover:underline"
                            >
                              {ingredient.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {ingredient.products.length === 0 ? (
                                <span className="text-muted-foreground text-sm">—</span>
                              ) : (
                                ingredient.products.map((product) => (
                                  <Link
                                    key={product.id}
                                    to={`/products/${product.id}`}
                                    className="inline-block"
                                  >
                                    <Badge
                                      variant={getCategoryBadgeVariant(product.category || "")}
                                      className="cursor-pointer hover:opacity-80"
                                    >
                                      {product.name}
                                    </Badge>
                                  </Link>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {ingredient.categoryBreakdown.Moisturizer > 0 ? (
                              <span className="font-medium">{ingredient.categoryBreakdown.Moisturizer}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {ingredient.categoryBreakdown.Cleanser > 0 ? (
                              <span className="font-medium">{ingredient.categoryBreakdown.Cleanser}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {ingredient.categoryBreakdown.Serum > 0 ? (
                              <span className="font-medium">{ingredient.categoryBreakdown.Serum}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {ingredient.categoryBreakdown["Foaming Shower Gel"] > 0 ? (
                              <span className="font-medium">{ingredient.categoryBreakdown["Foaming Shower Gel"]}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {ingredient.categoryBreakdown.Other > 0 ? (
                              <span className="font-medium">{ingredient.categoryBreakdown.Other}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {totalNeeded > 0 ? (
                              <span>{totalNeeded.toFixed(2)} {unit}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {ingredient.lastOrderQuantity ? (
                              <span>{ingredient.lastOrderQuantity} {unit}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const stock = ingredient.amountInStock || 0;
                              let colorClasses = '';
                              
                              if (stock === 0) {
                                colorClasses = 'bg-destructive/10 text-destructive';
                              } else if (stock < totalNeeded) {
                                colorClasses = 'bg-orange-500/10 text-orange-600';
                              } else {
                                colorClasses = 'bg-green-500/10 text-green-600';
                              }
                              
                              return (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
                                  {stock} {unit}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {selectedIngredients.has(ingredient.id) ? (
                              lockedOrderAmounts.has(ingredient.id) ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-medium">{orderAmounts[ingredient.id] || "0"}</span>
                                  <span className="text-sm text-muted-foreground">{unit}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-24 text-right"
                                    placeholder="0"
                                    value={orderAmounts[ingredient.id] || ""}
                                    onChange={(e) => {
                                      setOrderAmounts(prev => ({
                                        ...prev,
                                        [ingredient.id]: e.target.value
                                      }));
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground">{unit}</span>
                                </div>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {selectedIngredients.has(ingredient.id) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newLocked = new Set(lockedOrderAmounts);
                                  if (lockedOrderAmounts.has(ingredient.id)) {
                                    newLocked.delete(ingredient.id);
                                  } else {
                                    newLocked.add(ingredient.id);
                                  }
                                  setLockedOrderAmounts(newLocked);
                                }}
                              >
                                {lockedOrderAmounts.has(ingredient.id) ? "Edit" : "Save"}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!selectedSupplierId && (
            <p className="text-muted-foreground text-center py-8">
              Select a supplier to view their ingredients and associated products.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Procurement;
