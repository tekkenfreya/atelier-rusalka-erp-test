import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm as Form } from "@/components/forms/ProductForm";
import { ProductIngredientRow } from "@/components/forms/ProductIngredientsTable";
import { MethodStepRow } from "@/components/forms/ProductMethodTable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [productIngredients, setProductIngredients] = useState<ProductIngredientRow[]>([]);
  const [productMethodSteps, setProductMethodSteps] = useState<MethodStepRow[]>([]);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch product ingredients with related data
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("product_ingredients")
        .select(`
          id,
          percentage,
          phase,
          ingredient_id,
          ingredients (
            id,
            name,
            scientific_name,
            function,
            supplier_id,
            suppliers (name)
          )
        `)
        .eq("product_id", id);

      if (ingredientsError) throw ingredientsError;

      if (ingredientsData) {
        const mappedIngredients: ProductIngredientRow[] = ingredientsData.map((pi: any) => ({
          id: pi.id,
          phase: pi.phase || "A",
          percentage: pi.percentage,
          ingredient_id: pi.ingredient_id,
          ingredient_name: pi.ingredients?.name || "",
          inci_name: pi.ingredients?.scientific_name || "",
          function: pi.ingredients?.function || "",
          supplier_name: pi.ingredients?.suppliers?.name || "",
        }));
        setProductIngredients(mappedIngredients);
      }

      // Fetch method steps
      const { data: methodData, error: methodError } = await supabase
        .from("product_method_steps")
        .select("*")
        .eq("product_id", id)
        .order("sort_order");

      if (methodError) throw methodError;

      if (methodData) {
        const mappedSteps: MethodStepRow[] = methodData.map((step: any) => ({
          id: step.id,
          step_number: step.step_number,
          step_type: step.step_type,
          content: step.content,
          sort_order: step.sort_order,
        }));
        setProductMethodSteps(mappedSteps);
      }
    } catch (error) {
      toast.error("Failed to load product");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any, ingredients: ProductIngredientRow[], methodSteps: MethodStepRow[]) => {
    try {
      let productId = id;

      if (id) {
        const { error } = await supabase
          .from("products")
          .update(data)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Delete existing product ingredients
      if (id) {
        await supabase
          .from("product_ingredients")
          .delete()
          .eq("product_id", id);
      }

      // Insert new product ingredients
      if (ingredients.length > 0 && productId) {
        const ingredientsToInsert = ingredients
          .filter((ing) => ing.ingredient_id && ing.ingredient_id.trim() !== "")
          .map((ing) => ({
            product_id: productId,
            ingredient_id: ing.ingredient_id,
            percentage: ing.percentage,
            phase: ing.phase,
          }));

        if (ingredientsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("product_ingredients")
            .insert(ingredientsToInsert);
          if (insertError) throw insertError;
        }
      }

      // Delete existing method steps
      if (id) {
        await supabase
          .from("product_method_steps")
          .delete()
          .eq("product_id", id);
      }

      // Insert new method steps
      if (methodSteps.length > 0 && productId) {
        const stepsToInsert = methodSteps.map((step, index) => ({
          product_id: productId,
          step_number: step.step_number,
          step_type: step.step_type,
          content: step.content,
          sort_order: index,
        }));

        const { error: stepsError } = await supabase
          .from("product_method_steps")
          .insert(stepsToInsert);
        if (stepsError) throw stepsError;
      }

      toast.success(id ? "Product updated successfully" : "Product created successfully");
      navigate("/");
    } catch (error: any) {
      let errorMessage = "Failed to save product";
      
      if (error.message?.includes("duplicate key") || error.code === "23505") {
        errorMessage = "Duplicate ingredient detected. Each ingredient can only be added once per product.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit Product" : "Create Product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            initialData={product}
            initialIngredients={productIngredients}
            initialMethodSteps={productMethodSteps}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/")}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormPage;
