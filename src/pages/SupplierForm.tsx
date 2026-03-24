import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm as Form } from "@/components/forms/SupplierForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SupplierFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id && id !== "new") fetchSupplier();
    else setLoading(false);
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setSupplier(data);
    } catch (error) {
      toast.error("Failed to load supplier");
      navigate("/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (id && id !== "new") {
        const { error } = await supabase
          .from("suppliers")
          .update(data)
          .eq("id", id);
        if (error) throw error;
        toast.success("Supplier updated successfully");
        navigate(`/suppliers/${id}`);
      } else {
        const { error } = await supabase.from("suppliers").insert(data);
        if (error) throw error;
        toast.success("Supplier created successfully");
        navigate("/suppliers");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save supplier");
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
      <Button variant="ghost" onClick={() => navigate("/suppliers")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id && id !== "new" ? "Edit Supplier" : "Create Supplier"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            initialData={supplier}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/suppliers")}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierFormPage;