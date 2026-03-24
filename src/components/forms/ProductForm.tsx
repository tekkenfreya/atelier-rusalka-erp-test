import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProductIngredientsTable,
  ProductIngredientRow,
} from "./ProductIngredientsTable";
import {
  ProductMethodTable,
  MethodStepRow,
} from "./ProductMethodTable";

const SKIN_TYPE_OPTIONS = [
  "Oily Skin",
  "Dry Skin",
  "Combination Skin",
  "Sensitive Skin",
  "All Skin Types",
] as const;

const CONCERN_TAG_OPTIONS = [
  "Breakouts or blemishes",
  "Uneven skin tone or dark spots",
  "Dullness or tired-looking skin",
  "Fine lines or wrinkles",
  "Lack of firmness",
  "Redness or irritation",
  "Dryness or dehydration",
  "Enlarged pores",
  "Oiliness or excess shine",
  "Texture irregularities",
  "Sensitivity or reactivity",
  "Under-eye concerns (dark circles, puffiness)",
] as const;

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  skin_type: z.string().optional(),
  category: z.string().optional(),
  product_level: z.string().optional(),
  manufacturer_id: z.string().optional(),
  formulator: z.string().optional(),
  formulator_email: z.string().email("Invalid email").optional().or(z.literal("")),
  testing_organism: z.string().optional(),
  status_of_tests: z.string().optional(),
  concern_tags: z.array(z.string()).optional(),
  safe_for_pregnancy: z.boolean().optional(),
  safe_for_rosacea: z.boolean().optional(),
  safe_for_eczema: z.boolean().optional(),
  contains_retinol: z.boolean().optional(),
  contains_bha: z.boolean().optional(),
  contains_pegs: z.boolean().optional(),
  contains_fragrance: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Manufacturer {
  id: string;
  name: string;
}

interface ProductInitialData {
  name?: string;
  skin_type?: string;
  category?: string;
  product_level?: string;
  manufacturer_id?: string;
  formulator?: string;
  formulator_email?: string;
  testing_organism?: string;
  status_of_tests?: string;
  concern_tags?: string[];
  safe_for_pregnancy?: boolean;
  safe_for_rosacea?: boolean;
  safe_for_eczema?: boolean;
  contains_retinol?: boolean;
  contains_bha?: boolean;
  contains_pegs?: boolean;
  contains_fragrance?: boolean;
}

interface ProductFormProps {
  initialData?: ProductInitialData;
  initialIngredients?: ProductIngredientRow[];
  initialMethodSteps?: MethodStepRow[];
  onSubmit: (data: ProductFormData, ingredients: ProductIngredientRow[], methodSteps: MethodStepRow[]) => Promise<void>;
  onCancel: () => void;
}

export const ProductForm = ({
  initialData,
  initialIngredients = [],
  initialMethodSteps = [],
  onSubmit,
  onCancel,
}: ProductFormProps) => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [productIngredients, setProductIngredients] =
    useState<ProductIngredientRow[]>(initialIngredients);
  const [methodSteps, setMethodSteps] = useState<MethodStepRow[]>(initialMethodSteps);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      skin_type: initialData?.skin_type || "",
      category: initialData?.category || "",
      product_level: initialData?.product_level || "",
      manufacturer_id: initialData?.manufacturer_id || "",
      formulator: initialData?.formulator || "",
      formulator_email: initialData?.formulator_email || "",
      testing_organism: initialData?.testing_organism || "",
      status_of_tests: initialData?.status_of_tests || "",
      concern_tags: initialData?.concern_tags || [],
      safe_for_pregnancy: initialData?.safe_for_pregnancy ?? true,
      safe_for_rosacea: initialData?.safe_for_rosacea ?? true,
      safe_for_eczema: initialData?.safe_for_eczema ?? true,
      contains_retinol: initialData?.contains_retinol ?? false,
      contains_bha: initialData?.contains_bha ?? false,
      contains_pegs: initialData?.contains_pegs ?? false,
      contains_fragrance: initialData?.contains_fragrance ?? false,
    },
  });

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    const { data, error } = await supabase
      .from("manufacturers")
      .select("id, name")
      .order("name");
    if (error) {
      console.error("Failed to fetch manufacturers:", error);
      return;
    }
    if (data) setManufacturers(data);
  };

  const handleSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const cleanedData = {
        ...data,
        manufacturer_id: data.manufacturer_id || null,
      };
      await onSubmit(cleanedData, productIngredients, methodSteps);
    } catch (err) {
      console.error("Failed to submit product:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConcernTag = (tag: string) => {
    const current = form.getValues("concern_tags") || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    form.setValue("concern_tags", updated, { shouldDirty: true });
  };

  const concernTags = form.watch("concern_tags") || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter product name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="skin_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skin Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skin type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SKIN_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Serum">Serum</SelectItem>
                    <SelectItem value="Moisturizer">Moisturizer</SelectItem>
                    <SelectItem value="Cleanser">Cleanser</SelectItem>
                    <SelectItem value="Foaming Shower Gel">Foaming Shower Gel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="End Product">End Product</SelectItem>
                    <SelectItem value="Base">Base</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="manufacturer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manufacturer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
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
            name="formulator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Formulator</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Formulator name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="formulator_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Formulator Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="formulator@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="testing_organism"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Testing Organism</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Testing organization name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status_of_tests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status of Tests</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., In Progress, Completed, Pending" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Concern Tags */}
        <div className="space-y-3">
          <FormLabel>Concern Tags</FormLabel>
          <FormDescription>
            Which skin concerns does this product target?
          </FormDescription>
          <div className="flex flex-wrap gap-2">
            {CONCERN_TAG_OPTIONS.map((tag) => {
              const isSelected = concernTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer select-none transition-colors ${
                    isSelected ? "" : "hover:bg-secondary/50"
                  }`}
                  onClick={() => toggleConcernTag(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Safety Flags */}
        <div className="space-y-4">
          <div>
            <FormLabel>Safety Flags</FormLabel>
            <FormDescription>
              Mark safety info and notable ingredients.
            </FormDescription>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="safe_for_pregnancy"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Safe for pregnancy</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="safe_for_rosacea"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Safe for rosacea</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="safe_for_eczema"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Safe for eczema</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contains_retinol"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Contains retinol</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contains_bha"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Contains BHA</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contains_pegs"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Contains PEGs</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* contains_fragrance toggle removed — fragrance is a customer choice (F0/F1/F2) on the results page */}
          </div>
        </div>

        <ProductIngredientsTable
          ingredients={productIngredients}
          onChange={setProductIngredients}
        />

        <ProductMethodTable
          steps={methodSteps}
          onChange={setMethodSteps}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
