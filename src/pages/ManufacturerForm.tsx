import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManufacturerForm as Form } from "@/components/forms/ManufacturerForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ManufacturerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id && id !== "new") fetchManufacturer();
    else setLoading(false);
  }, [id]);

  const fetchManufacturer = async () => {
    try {
      const { data, error } = await supabase
        .from("manufacturers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setManufacturer(data);
    } catch (error) {
      toast.error("Failed to load manufacturer");
      navigate("/manufacturers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (id && id !== "new") {
        const { error } = await supabase
          .from("manufacturers")
          .update(data)
          .eq("id", id);
        if (error) throw error;
        toast.success("Manufacturer updated successfully");
        navigate(`/manufacturers/${id}`);
      } else {
        const { error } = await supabase.from("manufacturers").insert(data);
        if (error) throw error;
        toast.success("Manufacturer created successfully");
        navigate("/manufacturers");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save manufacturer");
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
      <Button variant="ghost" onClick={() => navigate("/manufacturers")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id && id !== "new" ? "Edit Manufacturer" : "Create Manufacturer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            initialData={manufacturer}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/manufacturers")}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ManufacturerFormPage;