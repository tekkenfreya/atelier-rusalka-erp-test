import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "react-router-dom";

interface OrderItem {
  id: string;
  ingredient_id: string;
  order_amount: number;
  original_order_amount: number;
  ingredient_name: string;
  quantity_unit: string | null;
  amount_in_stock: number;
}

interface Order {
  id: string;
  order_number: string;
  supplier_name: string;
  user_email: string;
  created_at: string;
  items?: OrderItem[];
}

const OrderLog = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingReception, setConfirmingReception] = useState<Set<string>>(new Set());
  const [cancellingReception, setCancellingReception] = useState<Set<string>>(new Set());

  const handleConfirmReception = async (item: OrderItem) => {
    setConfirmingReception((prev) => new Set(prev).add(item.id));
    try {
      // Fetch current stock
      const { data: ingredient, error: fetchError } = await supabase
        .from("ingredients")
        .select("amount_in_stock")
        .eq("id", item.ingredient_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentStock = ingredient?.amount_in_stock || 0;
      const newStock = currentStock + item.order_amount;

      // Update stock and reset last_order_quantity
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          amount_in_stock: newStock,
          last_order_quantity: 0,
        })
        .eq("id", item.ingredient_id);

      if (updateError) throw updateError;

      // Update order_items to set order_amount to 0 (marks as received)
      const { error: orderItemError } = await supabase
        .from("order_items")
        .update({ order_amount: 0 })
        .eq("id", item.id);

      if (orderItemError) throw orderItemError;

      toast({
        title: "Reception confirmed",
        description: `${item.order_amount} ${item.quantity_unit || "g"} of ${item.ingredient_name} added to stock.`,
      });

      // Update local state to reflect the change
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items?.map((orderItem) =>
            orderItem.id === item.id
              ? { ...orderItem, order_amount: 0, amount_in_stock: newStock }
              : orderItem
          ),
        }))
      );
    } catch (error) {
      console.error("Error confirming reception:", error);
      toast({
        title: "Error",
        description: "Failed to confirm reception.",
        variant: "destructive",
      });
    } finally {
      setConfirmingReception((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleCancelReception = async (item: OrderItem) => {
    setCancellingReception((prev) => new Set(prev).add(item.id));
    try {
      // Fetch current stock
      const { data: ingredient, error: fetchError } = await supabase
        .from("ingredients")
        .select("amount_in_stock")
        .eq("id", item.ingredient_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentStock = ingredient?.amount_in_stock || 0;
      const newStock = Math.max(0, currentStock - item.original_order_amount);

      // Subtract from stock and restore last_order_quantity
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          amount_in_stock: newStock,
          last_order_quantity: item.original_order_amount,
        })
        .eq("id", item.ingredient_id);

      if (updateError) throw updateError;

      // Update order_items to restore original order_amount
      const { error: orderItemError } = await supabase
        .from("order_items")
        .update({ order_amount: item.original_order_amount })
        .eq("id", item.id);

      if (orderItemError) throw orderItemError;

      toast({
        title: "Reception cancelled",
        description: `${item.original_order_amount} ${item.quantity_unit || "g"} of ${item.ingredient_name} removed from stock.`,
      });

      // Update local state to reflect the change
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items?.map((orderItem) =>
            orderItem.id === item.id
              ? { ...orderItem, order_amount: item.original_order_amount, amount_in_stock: newStock }
              : orderItem
          ),
        }))
      );
    } catch (error) {
      console.error("Error cancelling reception:", error);
      toast({
        title: "Error",
        description: "Failed to cancel reception.",
        variant: "destructive",
      });
    } finally {
      setCancellingReception((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, supplier_name, user_email, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    setLoadingItems((prev) => new Set(prev).add(orderId));
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          ingredient_id,
          order_amount,
          original_order_amount,
          ingredients:ingredient_id (
            name,
            quantity_unit,
            amount_in_stock
          )
        `)
        .eq("order_id", orderId);

      if (error) throw error;

      const items: OrderItem[] = (data || []).map((item: any) => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        order_amount: item.order_amount,
        original_order_amount: item.original_order_amount || item.order_amount,
        ingredient_name: item.ingredients?.name || "Unknown",
        quantity_unit: item.ingredients?.quantity_unit || "g",
        amount_in_stock: item.ingredients?.amount_in_stock || 0,
      }));

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, items } : order
        )
      );
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast({
        title: "Error",
        description: "Failed to load order items.",
        variant: "destructive",
      });
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (expandedOrders.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
      // Fetch items if not already loaded
      const order = orders.find((o) => o.id === orderId);
      if (order && !order.items) {
        fetchOrderItems(orderId);
      }
    }
    setExpandedOrders(newExpanded);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const idsToDelete = Array.from(selectedOrders);

      // First, fetch all order items for the orders being deleted
      for (const orderId of idsToDelete) {
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select(`
            ingredient_id,
            order_amount,
            original_order_amount,
            ingredients:ingredient_id (
              amount_in_stock
            )
          `)
          .eq("order_id", orderId);

        if (itemsError) {
          console.error("Error fetching order items:", itemsError);
          continue;
        }

        // For each order item, handle stock deduction if received
        for (const item of orderItems || []) {
          const currentStock = (item.ingredients as any)?.amount_in_stock || 0;
          const originalAmount = item.original_order_amount || item.order_amount || 0;
          
          // If order_amount is 0, it means reception was confirmed - deduct from stock
          if (item.order_amount === 0 && originalAmount > 0) {
            const newStock = Math.max(0, currentStock - originalAmount);
            
            const { error: stockError } = await supabase
              .from("ingredients")
              .update({ 
                amount_in_stock: newStock,
                last_order_date: null,
                last_order_quantity: null
              })
              .eq("id", item.ingredient_id);

            if (stockError) {
              console.error("Error updating stock for ingredient:", item.ingredient_id, stockError);
            }
          } else {
            // Item not yet received - just reset last_order_quantity
            const { error: resetError } = await supabase
              .from("ingredients")
              .update({ 
                last_order_date: null,
                last_order_quantity: null
              })
              .eq("id", item.ingredient_id);

            if (resetError) {
              console.error("Error resetting order data for ingredient:", item.ingredient_id, resetError);
            }
          }
        }
      }

      // Now delete the orders (order_items will be cascade deleted)
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      setOrders((prev) => prev.filter((order) => !selectedOrders.has(order.id)));
      setSelectedOrders(new Set());
      setExpandedOrders((prev) => {
        const newSet = new Set(prev);
        idsToDelete.forEach((id) => newSet.delete(id));
        return newSet;
      });
      toast({
        title: "Orders deleted",
        description: `${idsToDelete.length} order(s) deleted and stock adjusted.`,
      });
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast({
        title: "Error",
        description: "Failed to delete orders.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Log</h1>
        {selectedOrders.size > 0 && (
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedOrders.size})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            All Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Ordered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <Collapsible
                      key={order.id}
                      open={expandedOrders.has(order.id)}
                      onOpenChange={() => toggleExpanded(order.id)}
                      asChild
                    >
                      <>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.has(order.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedOrders);
                                if (checked) {
                                  newSelected.add(order.id);
                                } else {
                                  newSelected.delete(order.id);
                                }
                                setSelectedOrders(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {expandedOrders.has(order.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell>{order.supplier_name}</TableCell>
                          <TableCell>{order.user_email}</TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={6} className="p-0">
                              <div className="px-12 py-4">
                                <h4 className="text-sm font-medium mb-3">Order Items</h4>
                                {loadingItems.has(order.id) ? (
                                  <Skeleton className="h-16 w-full" />
                                ) : order.items && order.items.length > 0 ? (
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                                  <TableHeader>
                                                        <TableRow>
                                                          <TableHead>Ingredient</TableHead>
                                                          <TableHead className="text-right">Confirmed Order Amount</TableHead>
                                                          <TableHead className="text-right">Received Amount</TableHead>
                                                          <TableHead className="text-right">Stock</TableHead>
                                                          <TableHead className="text-right">Action</TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {order.items.map((item) => (
                                                          <TableRow key={item.id}>
                                                            <TableCell>
                                                              <Link
                                                                to={`/ingredients/${item.ingredient_id}`}
                                                                className="text-primary hover:underline"
                                                              >
                                                                {item.ingredient_name}
                                                              </Link>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                              {item.order_amount > 0 ? `${item.order_amount} ${item.quantity_unit || "g"}` : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                              {item.order_amount === 0 ? `${item.original_order_amount} ${item.quantity_unit || "g"}` : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                              {item.amount_in_stock} {item.quantity_unit || "g"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                              {item.order_amount > 0 ? (
                                                                <Button
                                                                  size="sm"
                                                                  onClick={() => handleConfirmReception(item)}
                                                                  disabled={confirmingReception.has(item.id)}
                                                                >
                                                                  {confirmingReception.has(item.id) ? "Confirming..." : "Confirm Reception"}
                                                                </Button>
                                                              ) : (
                                                                <Button
                                                                  size="sm"
                                                                  variant="secondary"
                                                                  onClick={() => handleCancelReception(item)}
                                                                  disabled={cancellingReception.has(item.id)}
                                                                >
                                                                  {cancellingReception.has(item.id) ? "Cancelling..." : "Cancel Confirmation"}
                                                                </Button>
                                                              )}
                                                            </TableCell>
                                                          </TableRow>
                                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No items in this order.
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              If deleted, this will remove all data linked to the selected order(s).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel Deletion</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Confirm Deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderLog;
