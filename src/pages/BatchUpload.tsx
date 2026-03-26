import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, FileJson, Loader2, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BatchIngredient {
  ingredient_name: string;
  percentage: string;
  phase?: string;
  function?: string;
}

interface BatchMethodStep {
  step_number: string;
  step_type?: string;
  content: string;
}

interface BatchProduct {
  name: string;
  category: string;
  skin_type: string;
  product_level: string;
  formulator: string;
  formulator_email: string;
  testing_organism: string;
  status_of_tests: string;
  concern_tags: string[];
  safe_for_pregnancy: boolean;
  safe_for_rosacea: boolean;
  safe_for_eczema: boolean;
  contains_retinol: boolean;
  contains_bha: boolean;
  contains_pegs: boolean;
  contains_fragrance: boolean;
  ingredients: BatchIngredient[];
  method_steps: BatchMethodStep[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface UploadSummary {
  productsCreated: number;
  ingredientsLinked: number;
  ingredientsCreated: number;
  methodStepsAdded: number;
  warnings: string[];
  errors: string[];
}

const TEMPLATE: BatchProduct[] = [
  {
    name: "SO6",
    category: "Serum",
    skin_type: "Oily Skin",
    product_level: "End Product",
    formulator: "",
    formulator_email: "",
    testing_organism: "",
    status_of_tests: "",
    concern_tags: ["Breakouts or blemishes", "Oiliness or excess shine"],
    safe_for_pregnancy: true,
    safe_for_rosacea: true,
    safe_for_eczema: true,
    contains_retinol: false,
    contains_bha: true,
    contains_pegs: false,
    contains_fragrance: true,
    ingredients: [
      {
        ingredient_name: "Salicylic Acid",
        percentage: "2",
        phase: "C",
      },
      {
        ingredient_name: "Niacinamide",
        percentage: "4",
        phase: "B",
      },
    ],
    method_steps: [
      {
        step_number: "1",
        step_type: "step",
        content: "Heat water phase to 75\u00B0C",
      },
      {
        step_number: "2",
        step_type: "step",
        content: "Add oil phase ingredients and emulsify",
      },
    ],
  },
];

const INGREDIENT_ALIASES: Record<string, string> = {
  "euxyl pe9010": "euxyl pe9010 (phenoxyethanol, ethylhexylglycerin)",
  "euxyl pe 9010": "euxyl pe9010 (phenoxyethanol, ethylhexylglycerin)",
  "water": "water (aqua)",
  "aquaxyl": "aquaxyltm",
  "vitamin e plant-based": "vitamine e plant-based",
  "matrixyl 3000": "matrixyl 3000",
  "matrixyl 3000 (anti-aging dipeptide)": "matrixyl 3000",
  "anti-aging dipeptide (matrixyl 3000)": "matrixyl 3000",
  "sepilift dphp": "sepilifttm dphp",
  "cosphaderm tocopharin": "cosphaderm\u00ae tocopharin",
  "stabilized coenzyme q10 (liquid)": "stabilized coenzyme q10",
  "vitamin c - ascorbyl tetraisopalmitate": "vitamin c",
  "sodium hydroxide (10% sol.)": "sodium hydroxide (18% solution)",
  "shea butter refined": "shea butter",
  "parfum [0.2]": "parfum",
  "rosa canina (rosehip) extract/oil": "organic rosehip seed co2 extract",
  "rosa canina (rosehip) extract": "organic rosehip seed co2 extract",
  "rosa canina (rosehip) seed oil": "organic rosehip seed co2 extract",
  "calendula officinalis (marigold) extract": "marigold co2 extract",
  "calendula officinalis (marigold) co2 extract": "marigold co2 extract",
  "calendula officinalis (marigold) co2/extract": "marigold co2 extract",
  "matricaria chamomilla (chamomile) extract": "chamomile co2 extract",
  "matricaria chamomilla (chamomile) co2 extract": "chamomile co2 extract",
  "jojoba oil cold-pressed": "coco-caprylate/caprate",
};

const REQUIRED_PRODUCT_FIELDS: (keyof BatchProduct)[] = ["name", "category", "skin_type", "product_level"];

const BOOLEAN_FIELDS: (keyof BatchProduct)[] = [
  "safe_for_pregnancy",
  "safe_for_rosacea",
  "safe_for_eczema",
  "contains_retinol",
  "contains_bha",
  "contains_pegs",
  "contains_fragrance",
];

function validateIngredients(
  ingredients: unknown,
  rowNum: number,
  errors: ValidationError[]
): BatchIngredient[] {
  if (ingredients === undefined || ingredients === null) return [];

  if (!Array.isArray(ingredients)) {
    errors.push({ row: rowNum, field: "ingredients", message: '"ingredients" must be an array' });
    return [];
  }

  const valid: BatchIngredient[] = [];

  for (let j = 0; j < ingredients.length; j++) {
    const ing = ingredients[j] as Record<string, unknown>;
    const prefix = `ingredients[${j}]`;

    if (typeof ing !== "object" || ing === null) {
      errors.push({ row: rowNum, field: prefix, message: "Each ingredient must be an object" });
      continue;
    }

    if (!ing.ingredient_name || typeof ing.ingredient_name !== "string" || ing.ingredient_name.trim() === "") {
      errors.push({ row: rowNum, field: `${prefix}.ingredient_name`, message: '"ingredient_name" is required' });
    }

    if (!ing.percentage || typeof ing.percentage !== "string" || ing.percentage.trim() === "") {
      errors.push({ row: rowNum, field: `${prefix}.percentage`, message: '"percentage" is required' });
    }

    if (ing.phase !== undefined && typeof ing.phase !== "string") {
      errors.push({ row: rowNum, field: `${prefix}.phase`, message: '"phase" must be a string' });
    }

    const hasIngErrors = errors.some(
      (e) => e.row === rowNum && e.field.startsWith(prefix)
    );

    if (!hasIngErrors) {
      valid.push({
        ingredient_name: (ing.ingredient_name as string).trim(),
        percentage: (ing.percentage as string).trim(),
        phase: ing.phase ? (ing.phase as string).trim() : undefined,
      });
    }
  }

  return valid;
}

function validateMethodSteps(
  steps: unknown,
  rowNum: number,
  errors: ValidationError[]
): BatchMethodStep[] {
  if (steps === undefined || steps === null) return [];

  if (!Array.isArray(steps)) {
    errors.push({ row: rowNum, field: "method_steps", message: '"method_steps" must be an array' });
    return [];
  }

  const valid: BatchMethodStep[] = [];

  for (let j = 0; j < steps.length; j++) {
    const step = steps[j] as Record<string, unknown>;
    const prefix = `method_steps[${j}]`;

    if (typeof step !== "object" || step === null) {
      errors.push({ row: rowNum, field: prefix, message: "Each method step must be an object" });
      continue;
    }

    if (!step.step_number || typeof step.step_number !== "string" || step.step_number.trim() === "") {
      errors.push({ row: rowNum, field: `${prefix}.step_number`, message: '"step_number" is required' });
    }

    if (!step.content || typeof step.content !== "string" || step.content.trim() === "") {
      errors.push({ row: rowNum, field: `${prefix}.content`, message: '"content" is required' });
    }

    if (step.step_type !== undefined && typeof step.step_type !== "string") {
      errors.push({ row: rowNum, field: `${prefix}.step_type`, message: '"step_type" must be a string' });
    }

    const hasStepErrors = errors.some(
      (e) => e.row === rowNum && e.field.startsWith(prefix)
    );

    if (!hasStepErrors) {
      valid.push({
        step_number: (step.step_number as string).trim(),
        step_type: step.step_type ? (step.step_type as string).trim() : undefined,
        content: (step.content as string).trim(),
      });
    }
  }

  return valid;
}

function validateProducts(data: unknown): { products: BatchProduct[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!Array.isArray(data)) {
    errors.push({ row: 0, field: "root", message: "JSON must be an array of products" });
    return { products: [], errors };
  }

  const products: BatchProduct[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;
    const rowNum = i + 1;

    if (typeof item !== "object" || item === null) {
      errors.push({ row: rowNum, field: "root", message: "Each entry must be an object" });
      continue;
    }

    const preCount = errors.length;

    for (const field of REQUIRED_PRODUCT_FIELDS) {
      if (!item[field] || (typeof item[field] === "string" && (item[field] as string).trim() === "")) {
        errors.push({ row: rowNum, field, message: `"${field}" is required` });
      }
    }

    if (typeof item.name !== "string") {
      errors.push({ row: rowNum, field: "name", message: '"name" must be a string' });
    }

    if (item.concern_tags !== undefined && !Array.isArray(item.concern_tags)) {
      errors.push({ row: rowNum, field: "concern_tags", message: '"concern_tags" must be an array of strings' });
    }

    for (const field of BOOLEAN_FIELDS) {
      if (item[field] !== undefined && typeof item[field] !== "boolean") {
        errors.push({ row: rowNum, field, message: `"${field}" must be a boolean` });
      }
    }

    const validIngredients = validateIngredients(item.ingredients, rowNum, errors);
    const validMethodSteps = validateMethodSteps(item.method_steps, rowNum, errors);

    const hasProductErrors = errors.length > preCount;

    if (!hasProductErrors) {
      products.push({
        name: item.name as string,
        category: (item.category as string) || "",
        skin_type: (item.skin_type as string) || "",
        product_level: (item.product_level as string) || "",
        formulator: (item.formulator as string) || "",
        formulator_email: (item.formulator_email as string) || "",
        testing_organism: (item.testing_organism as string) || "",
        status_of_tests: (item.status_of_tests as string) || "",
        concern_tags: (item.concern_tags as string[]) || [],
        safe_for_pregnancy: (item.safe_for_pregnancy as boolean) ?? false,
        safe_for_rosacea: (item.safe_for_rosacea as boolean) ?? false,
        safe_for_eczema: (item.safe_for_eczema as boolean) ?? false,
        contains_retinol: (item.contains_retinol as boolean) ?? false,
        contains_bha: (item.contains_bha as boolean) ?? false,
        contains_pegs: (item.contains_pegs as boolean) ?? false,
        contains_fragrance: (item.contains_fragrance as boolean) ?? false,
        ingredients: validIngredients,
        method_steps: validMethodSteps,
      });
    }
  }

  return { products, errors };
}

function downloadTemplate() {
  const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "batch-upload-template.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchIngredientMap(names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (names.length === 0) return map;

  const uniqueNames = [...new Set(names.map((n) => n.toLowerCase()))];

  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name");

  if (error) {
    console.error("Failed to fetch ingredients:", error);
    return map;
  }

  if (data) {
    for (const row of data) {
      map.set(row.name.toLowerCase(), row.id);
    }
  }

  return map;
}

const BatchUpload = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<BatchProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Only admin users can access the batch upload page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/")}>Go to Products</Button>
        </CardContent>
      </Card>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadSummary(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.target?.result as string);
        const { products: validProducts, errors } = validateProducts(parsed);
        setProducts(validProducts);
        setValidationErrors(errors);

        if (errors.length > 0) {
          toast.error(`${errors.length} validation error(s) found`);
        } else {
          toast.success(`${validProducts.length} product(s) ready for upload`);
        }
      } catch {
        setProducts([]);
        setValidationErrors([{ row: 0, field: "root", message: "Invalid JSON file" }]);
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearFile() {
    setProducts([]);
    setValidationErrors([]);
    setFileName(null);
    setUploadSummary(null);
  }

  async function handleUpload() {
    if (products.length === 0) return;
    setUploading(true);
    setUploadSummary(null);

    const summary: UploadSummary = {
      productsCreated: 0,
      ingredientsLinked: 0,
      ingredientsCreated: 0,
      methodStepsAdded: 0,
      warnings: [],
      errors: [],
    };

    const { data: existingProducts, error: existingError } = await supabase
      .from("products")
      .select("name");

    if (existingError) {
      console.error("Failed to check existing products:", existingError);
    }

    const existingNames = new Set(
      (existingProducts ?? []).map((p: { name: string }) => p.name.toLowerCase())
    );

    const allIngredientNames = products.flatMap((p) =>
      p.ingredients.map((ing) => ing.ingredient_name)
    );
    const ingredientMap = await fetchIngredientMap(allIngredientNames);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      if (existingNames.has(p.name.toLowerCase())) {
        summary.warnings.push(`Product "${p.name}" already exists in database — skipped`);
        continue;
      }

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          name: p.name,
          category: p.category || null,
          skin_type: p.skin_type || null,
          product_level: p.product_level || null,
          formulator: p.formulator || null,
          formulator_email: p.formulator_email || null,
          testing_organism: p.testing_organism || null,
          status_of_tests: p.status_of_tests || null,
          concern_tags: p.concern_tags,
          safe_for_pregnancy: p.safe_for_pregnancy,
          safe_for_rosacea: p.safe_for_rosacea,
          safe_for_eczema: p.safe_for_eczema,
          contains_retinol: p.contains_retinol,
          contains_bha: p.contains_bha,
          contains_pegs: p.contains_pegs,
          contains_fragrance: p.contains_fragrance,
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (productError || !productData) {
        console.error(`Failed to insert product "${p.name}":`, productError);
        summary.errors.push(`Product "${p.name}": ${productError?.message ?? "Unknown error"}`);
        continue;
      }

      summary.productsCreated++;
      const productId = productData.id;

      if (p.ingredients.length > 0) {
        const ingredientRows: { product_id: string; ingredient_id: string; percentage: string; phase: string | null }[] = [];

        for (const ing of p.ingredients) {
          const lowerName = ing.ingredient_name.toLowerCase();

          // 1. Try exact match (case-insensitive)
          let ingredientId = ingredientMap.get(lowerName);

          // 2. Try alias match
          if (!ingredientId) {
            const aliasTarget = INGREDIENT_ALIASES[lowerName];
            if (aliasTarget) {
              ingredientId = ingredientMap.get(aliasTarget.toLowerCase());
              if (ingredientId) {
                summary.warnings.push(
                  `Product "${p.name}": Ingredient "${ing.ingredient_name}" matched via alias → "${aliasTarget}"`
                );
              }
            }
          }

          // 3. Auto-create if still not found
          if (!ingredientId) {
            const { data: newIngredient, error: createError } = await supabase
              .from("ingredients")
              .insert({ name: ing.ingredient_name, type: "Ingredient", function: ing.function || null } as Record<string, unknown>)
              .select("id")
              .single();

            if (createError || !newIngredient) {
              console.error(`Failed to auto-create ingredient "${ing.ingredient_name}":`, createError);
              summary.errors.push(
                `Product "${p.name}": Failed to create ingredient "${ing.ingredient_name}" — ${createError?.message ?? "Unknown error"}`
              );
              continue;
            }

            ingredientId = newIngredient.id;
            ingredientMap.set(lowerName, ingredientId);
            summary.ingredientsCreated++;
            summary.warnings.push(
              `Product "${p.name}": Ingredient "${ing.ingredient_name}" auto-created in database`
            );
          }

          // Update function on existing ingredient if JSON provides one
          if (ing.function && ingredientId) {
            await supabase
              .from("ingredients")
              .update({ function: ing.function } as Record<string, unknown>)
              .eq("id", ingredientId);
          }

          ingredientRows.push({
            product_id: productId,
            ingredient_id: ingredientId,
            percentage: ing.percentage,
            phase: ing.phase || "A",
          });
        }

        if (ingredientRows.length > 0) {
          const { error: ingError } = await supabase
            .from("product_ingredients")
            .insert(ingredientRows);

          if (ingError) {
            console.error(`Failed to insert ingredients for "${p.name}":`, ingError);
            summary.errors.push(`Ingredients for "${p.name}": ${ingError.message}`);
          } else {
            summary.ingredientsLinked += ingredientRows.length;
          }
        }
      }

      if (p.method_steps.length > 0) {
        const stepRows = p.method_steps.map((step, idx) => ({
          product_id: productId,
          step_number: step.step_number,
          step_type: step.step_type || "step",
          content: step.content,
          sort_order: idx,
        }));

        const { error: stepError } = await supabase
          .from("product_method_steps")
          .insert(stepRows);

        if (stepError) {
          console.error(`Failed to insert method steps for "${p.name}":`, stepError);
          summary.errors.push(`Method steps for "${p.name}": ${stepError.message}`);
        } else {
          summary.methodStepsAdded += stepRows.length;
        }
      }
    }

    setUploading(false);
    setUploadSummary(summary);

    if (summary.errors.length === 0 && summary.warnings.length === 0) {
      toast.success(`Successfully uploaded ${summary.productsCreated} product(s)`);
    } else if (summary.errors.length > 0) {
      toast.error(`Upload completed with ${summary.errors.length} error(s)`);
    } else {
      toast.warning(`Upload completed with ${summary.warnings.length} warning(s)`);
    }

    if (summary.productsCreated > 0) {
      setProducts([]);
      setValidationErrors([]);
      setFileName(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Batch Upload</h1>
        <p className="text-muted-foreground mt-1">
          Upload a JSON file to add multiple products with ingredients and method steps.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Products
          </CardTitle>
          <CardDescription>
            Select a JSON file matching the product template format. Download the template below for reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {fileName ? "Choose Different File" : "Select JSON File"}
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            {fileName && (
              <Button variant="ghost" onClick={clearFile} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          {fileName && (
            <p className="text-sm text-muted-foreground">
              File: <span className="font-medium text-foreground">{fileName}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Validation Errors</CardTitle>
            <CardDescription>Fix the following errors before uploading.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {validationErrors.map((err, i) => (
                <li key={i} className="text-destructive">
                  {err.row > 0 ? `Row ${err.row}` : "File"} — {err.field}: {err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {uploadSummary && (
        <Card className={uploadSummary.errors.length > 0 ? "border-destructive" : "border-green-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadSummary.errors.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              Upload Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{uploadSummary.productsCreated}</p>
                <p className="text-muted-foreground">products created</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{uploadSummary.ingredientsLinked}</p>
                <p className="text-muted-foreground">ingredients linked</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{uploadSummary.ingredientsCreated}</p>
                <p className="text-muted-foreground">ingredients auto-created</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{uploadSummary.methodStepsAdded}</p>
                <p className="text-muted-foreground">method steps added</p>
              </div>
            </div>

            {uploadSummary.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">
                  Warnings ({uploadSummary.warnings.length})
                </p>
                <ul className="space-y-1 text-sm text-yellow-600">
                  {uploadSummary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {uploadSummary.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-destructive mb-1">
                  Errors ({uploadSummary.errors.length})
                </p>
                <ul className="space-y-1 text-sm text-destructive">
                  {uploadSummary.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {products.length > 0 && validationErrors.length === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview ({products.length} product{products.length !== 1 ? "s" : ""})</CardTitle>
              <CardDescription>Review the products below before uploading.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Skin Type</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Ingredients</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Concern Tags</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell>{p.skin_type}</TableCell>
                        <TableCell>{p.product_level}</TableCell>
                        <TableCell>
                          {p.ingredients.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {p.ingredients.length} ingredient{p.ingredients.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.method_steps.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {p.method_steps.length} step{p.method_steps.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.concern_tags.length > 0
                              ? p.concern_tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.safe_for_pregnancy && <Badge className="text-xs">Pregnancy-safe</Badge>}
                            {p.safe_for_rosacea && <Badge className="text-xs">Rosacea-safe</Badge>}
                            {p.safe_for_eczema && <Badge className="text-xs">Eczema-safe</Badge>}
                            {p.contains_retinol && <Badge variant="outline" className="text-xs">Retinol</Badge>}
                            {p.contains_bha && <Badge variant="outline" className="text-xs">BHA</Badge>}
                            {p.contains_pegs && <Badge variant="outline" className="text-xs">PEGs</Badge>}
                            {p.contains_fragrance && <Badge variant="outline" className="text-xs">Fragrance</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={uploading} size="lg">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {products.length} Product{products.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BatchUpload;
