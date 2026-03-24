import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const IngredientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();
  const [ingredient, setIngredient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchIngredient();
  }, [id]);

  const fetchIngredient = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setIngredient(data);
    } catch (error: any) {
      toast.error("Failed to load ingredient details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Ingredient deleted successfully");
      navigate("/ingredients");
    } catch (error: any) {
      toast.error("Failed to delete ingredient");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ingredient not found</p>
        <Button onClick={() => navigate("/ingredients")} className="mt-4">
          Back to Ingredients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/ingredients")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {(isAdmin || isEditor) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/ingredients/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this ingredient? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{ingredient.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Scientific Name</h3>
                  <p className="text-base">{ingredient.scientific_name || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Ingredient ID</h3>
                  <p className="text-base font-mono">{ingredient.ingredient_id || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
                  <p className="text-base">{ingredient.type || "Ingredient"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Function</h3>
                  <p className="text-base">{ingredient.function || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Primary Supplier</h3>
                  <p className="text-base">{ingredient.supplier?.name || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Other Suppliers</h3>
                  <p className="text-base">{ingredient.other_suppliers || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Life Expectancy</h3>
                  <p className="text-base">{ingredient.life_expectancy || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Order Date</h3>
                  <p className="text-base">
                    {ingredient.last_order_date 
                      ? format(new Date(ingredient.last_order_date), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Order Quantity</h3>
                  <p className="text-base">
                    {ingredient.last_order_quantity 
                      ? `${ingredient.last_order_quantity} ${ingredient.quantity_unit || 'g'}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount in Stock</h3>
                  <p className="text-base">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      (ingredient.amount_in_stock || 0) > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {ingredient.amount_in_stock || 0} {ingredient.quantity_unit || 'g'}
                    </span>
                  </p>
                </div>
              </div>

              {ingredient.skincare_priorities && ingredient.skincare_priorities.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Skincare Priorities</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ingredient.skincare_priorities.map((priority: string) => (
                      <Badge key={priority}>{priority}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {ingredient.comments && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Comments</h3>
                  <p className="text-base whitespace-pre-wrap">{ingredient.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent>
              {ingredient.image_url ? (
                <img
                  src={ingredient.image_url}
                  alt={ingredient.name}
                  className="w-full h-auto rounded-lg object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No image</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IngredientDetail;
