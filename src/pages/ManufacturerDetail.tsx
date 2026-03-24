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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ManufacturerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchManufacturer();
  }, [id]);

  const fetchManufacturer = async () => {
    try {
      const { data: manufacturerData, error: manufacturerError } = await supabase
        .from("manufacturers")
        .select("*")
        .eq("id", id)
        .single();

      if (manufacturerError) throw manufacturerError;

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("manufacturer_id", id);

      if (productsError) throw productsError;

      setManufacturer(manufacturerData);
      setProducts(productsData || []);
    } catch (error: any) {
      toast.error("Failed to load manufacturer details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("manufacturers").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Manufacturer deleted successfully");
      navigate("/manufacturers");
    } catch (error: any) {
      toast.error("Failed to delete manufacturer");
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

  if (!manufacturer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Manufacturer not found</p>
        <Button onClick={() => navigate("/manufacturers")} className="mt-4">
          Back to Manufacturers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/manufacturers")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {(isAdmin || isEditor) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/manufacturers/${id}/edit`)}>
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
                  <AlertDialogTitle>Delete Manufacturer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this manufacturer? This action cannot be undone.
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
          <CardTitle className="text-2xl">{manufacturer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact Person</h3>
              <p className="text-base">{manufacturer.contact_person || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
              <p className="text-base">{manufacturer.email || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone</h3>
              <p className="text-base">{manufacturer.phone || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
              <p className="text-base">{manufacturer.address || "—"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Manufactured Products ({products.length})</h3>
            {products.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Skin Type</TableHead>
                      <TableHead>Test Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.skin_type || "—"}</TableCell>
                        <TableCell>{product.status_of_tests || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No products from this manufacturer</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManufacturerDetail;