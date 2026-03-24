import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BatchCalculator } from "@/components/BatchCalculator";
import { ProductMethod } from "@/components/ProductMethod";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [methodSteps, setMethodSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          *,
          manufacturer:manufacturers(*)
        `)
        .eq("id", id)
        .single();

      if (productError) throw productError;

      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("product_ingredients")
        .select(`
          percentage,
          phase,
          ingredient:ingredients(*)
        `)
        .eq("product_id", id)
        .order("phase");

      if (ingredientsError) throw ingredientsError;

      const { data: methodData, error: methodError } = await supabase
        .from("product_method_steps")
        .select("*")
        .eq("product_id", id)
        .order("sort_order");

      if (methodError) throw methodError;

      setProduct(productData);
      setIngredients(ingredientsData || []);
      setMethodSteps(methodData || []);
    } catch (error: any) {
      toast.error("Failed to load product details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Product deleted successfully");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to delete product");
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

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {(isAdmin || isEditor) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/products/${id}/edit`)}>
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
                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this product? This action cannot be undone.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Skin Type</h3>
              <p className="text-base">{product.skin_type || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Product Category</h3>
              <p className="text-base">{product.category || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Product Level</h3>
              <p className="text-base">{product.product_level || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Test Status</h3>
              <p className="text-base">{product.status_of_tests || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Formulator</h3>
              <p className="text-base">{product.formulator || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Formulator Email</h3>
              <p className="text-base">{product.formulator_email || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Manufacturer</h3>
              <p className="text-base">{product.manufacturer?.name || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Testing Organism</h3>
              <p className="text-base">{product.testing_organism || "—"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
            {ingredients.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Phase</TableHead>
                      <TableHead>Ingredient Name</TableHead>
                      <TableHead>INCI Name</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.phase || "A"}</TableCell>
                        <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.ingredient.scientific_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{item.ingredient.function || "—"}</TableCell>
                        <TableCell className="text-right">{item.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-medium">Total</TableCell>
                      <TableCell className={`text-right font-bold ${
                        (() => {
                          const total = ingredients.reduce((sum, i) => {
                            const parsed = parseFloat(String(i.percentage).replace(",", "."));
                            return sum + (isNaN(parsed) ? 0 : parsed);
                          }, 0);
                          return Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-destructive";
                        })()
                      }`}>
                        {ingredients.reduce((sum, i) => {
                          const parsed = parseFloat(String(i.percentage).replace(",", "."));
                          return sum + (isNaN(parsed) ? 0 : parsed);
                        }, 0).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No ingredients added</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ProductMethod steps={methodSteps} />

      {ingredients.length > 0 && (
        <BatchCalculator
          ingredients={ingredients.map((item: any) => ({
            name: item.ingredient.name,
            percentage: item.percentage,
          }))}
        />
      )}
    </div>
  );
};

export default ProductDetail;
