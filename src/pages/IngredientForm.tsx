import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IngredientForm as Form } from "@/components/forms/IngredientForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const IngredientFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ingredient, setIngredient] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) fetchIngredient();
  }, [id]);

  const fetchIngredient = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setIngredient(data);
    } catch (error) {
      toast.error("Failed to load ingredient");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (id) {
        const { error } = await supabase
          .from("ingredients")
          .update(data)
          .eq("id", id);
        if (error) throw error;
        toast.success("Ingredient updated successfully");
        navigate(`/ingredients/${id}`);
      } else {
        const { error } = await supabase.from("ingredients").insert(data);
        if (error) throw error;
        toast.success("Ingredient created successfully");
        navigate("/ingredients");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save ingredient");
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
          <CardTitle>{id ? "Edit Ingredient" : "Create Ingredient"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            initialData={ingredient}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/")}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientFormPage;