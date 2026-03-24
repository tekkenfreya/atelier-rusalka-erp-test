import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDescription } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

const SKINCARE_PRIORITIES = [
  "Anti-aging",
  "Brightening",
  "Hydration",
  "Calming",
  "Clarifying",
  "Repair",
];

const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  scientific_name: z.string().optional().or(z.literal("")),
  ingredient_id: z.string().optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  function: z.string().optional().or(z.literal("")),
  supplier_id: z.string().optional().or(z.literal("")),
  other_suppliers: z.string().optional().or(z.literal("")),
  life_expectancy: z.string().optional().or(z.literal("")),
  last_order_date: z.string().optional().or(z.literal("")),
  last_order_quantity: z.coerce.number().optional().nullable(),
  amount_in_stock: z.coerce.number().optional().nullable(),
  quantity_unit: z.string().optional().or(z.literal("")),
  comments: z.string().optional().or(z.literal("")),
  skincare_priorities: z.array(z.string()).optional(),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface IngredientFormProps {
  initialData?: any;
  onSubmit: (data: IngredientFormData & { image_url?: string }) => Promise<void>;
  onCancel: () => void;
}

export const IngredientForm = ({ initialData, onSubmit, onCancel }: IngredientFormProps) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.image_url || "");
  const [uploading, setUploading] = useState(false);

  const form = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: initialData?.name || "",
      scientific_name: initialData?.scientific_name || "",
      ingredient_id: initialData?.ingredient_id || "",
      type: initialData?.type || "Ingredient",
      function: initialData?.function || "",
      supplier_id: initialData?.supplier_id || "",
      other_suppliers: initialData?.other_suppliers || "",
      life_expectancy: initialData?.life_expectancy || "",
      last_order_date: initialData?.last_order_date || "",
      last_order_quantity: initialData?.last_order_quantity ?? undefined,
      amount_in_stock: initialData?.amount_in_stock ?? undefined,
      quantity_unit: initialData?.quantity_unit || "",
      comments: initialData?.comments || "",
      skincare_priorities: initialData?.skincare_priorities || [],
    },
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .order("name");
    if (data) setSuppliers(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return initialData?.image_url || null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ingredient-images")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("ingredient-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (data: IngredientFormData) => {
    setLoading(true);
    try {
      const imageUrl = await uploadImage();
      // Transform empty strings to null for optional fields
      const cleanedData = {
        ...data,
        scientific_name: data.scientific_name || null,
        ingredient_id: data.ingredient_id || null,
        type: data.type || "Ingredient",
        function: data.function || null,
        supplier_id: data.supplier_id || null,
        other_suppliers: data.other_suppliers || null,
        life_expectancy: data.life_expectancy || null,
        last_order_date: data.last_order_date || null,
        last_order_quantity: data.last_order_quantity || null,
        amount_in_stock: data.amount_in_stock || null,
        quantity_unit: data.quantity_unit || null,
        comments: data.comments || null,
        skincare_priorities: data.skincare_priorities || [],
        image_url: imageUrl || undefined,
      };
      await onSubmit(cleanedData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingredient Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter ingredient name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scientific_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scientific Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter scientific name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ingredient_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingredient ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter ingredient ID" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "Ingredient"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ingredient">Ingredient</SelectItem>
                    <SelectItem value="Base">Base</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="function"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Function</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Emollient, Humectant" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="skincare_priorities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skincare Priorities</FormLabel>
                  <FormDescription>Which skincare priorities does this ingredient serve?</FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SKINCARE_PRIORITIES.map((priority) => {
                      const selected = (field.value || []).includes(priority);
                      return (
                        <Badge
                          key={priority}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          onClick={() => {
                            const current = field.value || [];
                            const updated = selected
                              ? current.filter((p: string) => p !== priority)
                              : [...current, priority];
                            field.onChange(updated);
                          }}
                        >
                          {priority}
                        </Badge>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="supplier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Supplier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="other_suppliers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Suppliers</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Comma-separated list" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="life_expectancy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Life Expectancy</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., 2 years" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_order_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Order Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_order_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Order Quantity</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount_in_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount in Stock</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="g, ml, kg, etc." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel>Ingredient Image</FormLabel>
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-muted-foreground" />
              </label>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional notes..." rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploading}>
            {uploading ? "Uploading..." : loading ? "Saving..." : initialData ? "Update Ingredient" : "Create Ingredient"}
          </Button>
        </div>
      </form>
    </Form>
  );
};