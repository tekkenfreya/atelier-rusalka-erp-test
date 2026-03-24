import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import IngredientsTable from "@/components/tables/IngredientsTable";
import ExtractDialog from "@/components/ExtractDialog";

interface Supplier {
  id: string;
  name: string;
}

const Ingredients = () => {
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredients();
    fetchSuppliers();
  }, []);

  const fetchIngredients = async () => {
    try {
      const { data } = await supabase.from("ingredients").select(`
        *,
        supplier:suppliers(name)
      `);

      if (data) setIngredients(data);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");
      if (data) setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const canManage = isAdmin || isEditor;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingredients</h1>
          <p className="text-muted-foreground">
            Manage your cosmetic ingredients
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ingredients</CardTitle>
          <div className="flex items-center gap-2">
            <ExtractDialog ingredients={ingredients} suppliers={suppliers} />
            {canManage && (
              <Button onClick={() => navigate("/ingredients/new")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <IngredientsTable ingredients={ingredients} loading={loading} isAdmin={canManage} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Ingredients;
