import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CloudStorageIntegration {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_connected: boolean;
  provider: string;
}

interface BatchConfig {
  moisturizerVolume: number;
  moisturizerQuantity: number;
  cleanserVolume: number;
  cleanserQuantity: number;
  serumVolume: number;
  serumQuantity: number;
  foamingShowerGelVolume: number;
  foamingShowerGelQuantity: number;
}

interface SharePointConfig {
  siteId: string;
  siteName?: string;
  libraryId: string;
  libraryName?: string;
  folderPath: string;
}

interface ScheduledExport {
  id: string;
  user_id: string;
  saved_export_id: string;
  frequency: string;
  scheduled_hour: number;
  destination: string;
  destination_path: string | null;
  email: string | null;
  format: string;
  is_active: boolean;
  next_run_at: string;
  saved_exports: {
    id: string;
    name: string;
    type: string;
    fields: string[];
    batch_config: BatchConfig | null;
  };
}

interface Ingredient {
  id: string;
  name: string;
  amount_in_stock: number | null;
  last_order_quantity: number | null;
  suppliers?: { name: string } | null;
}

interface ProductIngredient {
  ingredient_id: string;
  percentage: string;
  products?: { name: string; category: string | null } | null;
}

// Refresh Microsoft token (works for both OneDrive and SharePoint)
async function refreshMicrosoftToken(
  supabase: SupabaseClient, 
  userId: string, 
  provider: "onedrive" | "sharepoint"
): Promise<string | null> {
  const { data: integration, error } = await supabase
    .from("cloud_storage_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_connected", true)
    .maybeSingle();

  if (error || !integration) {
    console.error(`No ${provider} integration found for user:`, userId, error);
    return null;
  }

  const integrationData = integration as CloudStorageIntegration;

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = new Date(integrationData.token_expires_at);
  if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return integrationData.access_token;
  }

  // Refresh the token
  console.log(`Refreshing ${provider} token for user:`, userId);
  
  // SharePoint requires specific scopes
  const scopes = provider === "sharepoint" 
    ? "Sites.ReadWrite.All offline_access User.Read"
    : "Files.ReadWrite offline_access User.Read";
  
  const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: integrationData.refresh_token,
      grant_type: "refresh_token",
      scope: scopes,
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    console.error("Token refresh error:", tokens);
    return null;
  }

  // Update tokens in database
  await supabase
    .from("cloud_storage_integrations")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || integrationData.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationData.id);

  return tokens.access_token;
}

// Legacy function for backward compatibility
async function refreshOneDriveToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  return refreshMicrosoftToken(supabase, userId, "onedrive");
}

// Get content type for format
function getContentType(format: string): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "csv":
    case "csv-utf8":
      return "text/csv";
    default:
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
}

// Get file extension for format
function getFileExtension(format: string): string {
  switch (format) {
    case "pdf":
      return "pdf";
    case "csv":
    case "csv-utf8":
      return "csv";
    default:
      return "xlsx";
  }
}

// Upload file to OneDrive
async function uploadToOneDrive(
  accessToken: string,
  folderPath: string,
  fileName: string,
  fileContent: Uint8Array,
  contentType: string
): Promise<{ success: boolean; error?: string }> {
  // Ensure folder path starts with /
  const normalizedPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
  const fullPath = `${normalizedPath}/${fileName}`.replace(/\/+/g, "/");

  console.log("Uploading to OneDrive path:", fullPath);

  // Use simple upload for files < 4MB
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${fullPath}:/content`;

  // Convert Uint8Array to Blob for fetch body
  const blob = new Blob([fileContent.buffer as ArrayBuffer], { type: contentType });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OneDrive upload error:", error);
    return { success: false, error };
  }

  console.log("File uploaded successfully to OneDrive");
  return { success: true };
}

// Upload file to SharePoint
async function uploadToSharePoint(
  accessToken: string,
  config: SharePointConfig,
  fileName: string,
  fileContent: Uint8Array,
  contentType: string
): Promise<{ success: boolean; error?: string }> {
  const { siteId, libraryId, folderPath } = config;
  
  // Normalize folder path
  const normalizedPath = folderPath === "/" || !folderPath ? "" : folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
  const fullPath = normalizedPath ? `${normalizedPath}/${fileName}` : `/${fileName}`;
  const cleanPath = fullPath.replace(/\/+/g, "/");

  console.log(`Uploading to SharePoint site: ${siteId}, library: ${libraryId}, path: ${cleanPath}`);

  // Use Graph API to upload to SharePoint document library
  // Format: /sites/{site-id}/drives/{drive-id}/root:{path}:/content
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${libraryId}/root:${cleanPath}:/content`;

  // Convert Uint8Array to Blob for fetch body
  const blob = new Blob([fileContent.buffer as ArrayBuffer], { type: contentType });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SharePoint upload error:", error);
    return { success: false, error };
  }

  console.log("File uploaded successfully to SharePoint");
  return { success: true };
}

async function generateProcurementExport(
  supabase: SupabaseClient,
  fields: string[],
  batchConfig: BatchConfig | null,
  format: string
): Promise<Uint8Array> {
  // Fetch all data needed for procurement export
  const { data: ingredientsData } = await supabase
    .from("ingredients")
    .select("*, suppliers(name)")
    .order("name");

  const { data: productIngredientsData } = await supabase
    .from("product_ingredients")
    .select("*, products(name, category)");

  const ingredients = (ingredientsData || []) as Ingredient[];
  const productIngredients = (productIngredientsData || []) as ProductIngredient[];

  // Calculate product usage per ingredient (count)
  const ingredientUsage: Record<string, Record<string, number>> = {};
  
  // Store percentages for "Needed" calculation
  const ingredientPercentages: Record<string, { category: string; percentage: number }[]> = {};
  
  productIngredients.forEach((pi) => {
    if (!ingredientUsage[pi.ingredient_id]) {
      ingredientUsage[pi.ingredient_id] = {};
      ingredientPercentages[pi.ingredient_id] = [];
    }
    const category = pi.products?.category?.toLowerCase() || "other";
    ingredientUsage[pi.ingredient_id][category] = (ingredientUsage[pi.ingredient_id][category] || 0) + 1;
    
    // Store percentage for calculation
    const percentage = parseFloat(String(pi.percentage).replace(",", ".")) || 0;
    ingredientPercentages[pi.ingredient_id].push({ category, percentage });
  });

  // Helper function to calculate "Needed" for an ingredient
  const calculateNeeded = (ingredientId: string): number => {
    if (!batchConfig) return 0;
    
    const percentages = ingredientPercentages[ingredientId] || [];
    let total = 0;
    
    percentages.forEach(({ category, percentage }) => {
      let volume = 0;
      let quantity = 0;
      
      if (category === "moisturizer") {
        volume = batchConfig.moisturizerVolume;
        quantity = batchConfig.moisturizerQuantity;
      } else if (category === "cleanser") {
        volume = batchConfig.cleanserVolume;
        quantity = batchConfig.cleanserQuantity;
      } else if (category === "serum") {
        volume = batchConfig.serumVolume;
        quantity = batchConfig.serumQuantity;
      } else if (category === "foaming shower gel") {
        volume = batchConfig.foamingShowerGelVolume;
        quantity = batchConfig.foamingShowerGelQuantity;
      }
      
      // Formula: (percentage / 100) * volume * quantity
      const amountForProduct = (percentage / 100) * volume * quantity;
      total += amountForProduct;
    });
    
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  // Build export data based on selected fields
  const exportData = ingredients.map((ing) => {
    const row: Record<string, unknown> = {};
    const usage = ingredientUsage[ing.id] || {};

    if (fields.includes("ingredient")) row["Ingredient"] = ing.name;
    if (fields.includes("products")) {
      const totalProducts = Object.values(usage).reduce((a, b) => a + b, 0);
      row["Products"] = totalProducts;
    }
    if (fields.includes("moisturizer")) row["Moisturizer"] = usage["moisturizer"] || 0;
    if (fields.includes("cleanser")) row["Cleanser"] = usage["cleanser"] || 0;
    if (fields.includes("serum")) row["Serum"] = usage["serum"] || 0;
    if (fields.includes("foamingShowerGel")) row["Foaming Shower Gel"] = usage["foaming shower gel"] || 0;
    if (fields.includes("other")) row["Other"] = usage["other"] || 0;
    if (fields.includes("needed")) row["Needed"] = calculateNeeded(ing.id);
    if (fields.includes("ordered")) row["Ordered"] = ing.last_order_quantity || 0;
    if (fields.includes("stock")) row["Stock"] = ing.amount_in_stock || 0;

    return row;
  });

  // Generate output based on format
  if (format === "csv" || format === "csv-utf8") {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    if (format === "csv-utf8") {
      // UTF-8 with BOM for proper encoding in Excel
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const encoder = new TextEncoder();
      const csvBytes = encoder.encode(csvContent);
      const result = new Uint8Array(bom.length + csvBytes.length);
      result.set(bom);
      result.set(csvBytes, bom.length);
      return result;
    } else {
      const encoder = new TextEncoder();
      return encoder.encode(csvContent);
    }
  } else {
    // Excel format (default)
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Format as Excel table with auto-filter
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      
      // Set column widths based on header length
      worksheet["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
      
      // Add auto-filter to the header row
      worksheet["!autofilter"] = { ref: worksheet["!ref"] || "A1" };
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    return new Uint8Array(buffer);
  }
}

// Calculate next run time based on frequency and scheduled hour
// Always calculates the next occurrence from now
function calculateNextRunTime(frequency: string, scheduledHour: number): Date {
  const now = new Date();
  const next = new Date(now);
  
  // Set to the scheduled hour (stored as local hour, but we work in UTC)
  // The scheduledHour is stored as the user's local hour
  next.setUTCHours(scheduledHour, 0, 0, 0);
  
  // For daily: if today's scheduled time has passed, use tomorrow
  // For weekly/monthly: add the appropriate interval
  switch (frequency) {
    case "daily":
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
  }
  
  return next;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body for manual trigger or use scheduled run
    let scheduleId: string | null = null;
    try {
      const body = await req.json();
      scheduleId = body.scheduleId;
    } catch {
      // No body - this is a scheduled run, process all due exports
    }

    // Build query for scheduled exports
    let query = supabase
      .from("scheduled_exports")
      .select(`
        *,
        saved_exports (
          id,
          name,
          type,
          fields,
          batch_config
        )
      `)
      .eq("is_active", true);

    if (scheduleId) {
      // Manual trigger for specific schedule
      query = query.eq("id", scheduleId);
    } else {
      // Scheduled run - get all due exports
      query = query.lte("next_run_at", new Date().toISOString());
    }

    const { data: schedules, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching schedules:", fetchError);
      throw fetchError;
    }

    console.log(`Processing ${schedules?.length || 0} scheduled exports`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const schedule of (schedules as ScheduledExport[]) || []) {
      console.log(`Processing schedule: ${schedule.id} for export: ${schedule.saved_exports?.name}`);

      // Create history entry
      const { data: historyEntry } = await supabase
        .from("export_history")
        .insert({
          scheduled_export_id: schedule.id,
          status: "running",
        })
        .select()
        .single();

      try {
        // Generate export file based on type and format
        const exportFormat = schedule.format || "excel";
        const fileExtension = getFileExtension(exportFormat);
        const contentType = getContentType(exportFormat);
        
        let fileContent: Uint8Array;
        const now = new Date();
        const datePart = now.toISOString().split("T")[0];
        const timePart = now.toISOString().split("T")[1].split(".")[0].replace(/:/g, "-");
        const fileName = `${schedule.saved_exports.name}_${datePart}_${timePart}.${fileExtension}`;

        if (schedule.saved_exports.type === "procurement") {
          fileContent = await generateProcurementExport(
            supabase, 
            schedule.saved_exports.fields,
            schedule.saved_exports.batch_config,
            exportFormat
          );
        } else {
          throw new Error(`Unsupported export type: ${schedule.saved_exports.type}`);
        }

        // Upload to destination
        if (schedule.destination === "onedrive") {
          const accessToken = await refreshOneDriveToken(supabase, schedule.user_id);
          if (!accessToken) {
            throw new Error("Failed to get OneDrive access token");
          }

          const uploadResult = await uploadToOneDrive(
            accessToken,
            schedule.destination_path || "/Recip3 Exports",
            fileName,
            fileContent,
            contentType
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || "Upload failed");
          }
        } else if (schedule.destination === "sharepoint") {
          const accessToken = await refreshMicrosoftToken(supabase, schedule.user_id, "sharepoint");
          if (!accessToken) {
            throw new Error("Failed to get SharePoint access token");
          }

          // Parse SharePoint config from destination_path
          let spConfig: SharePointConfig;
          try {
            spConfig = JSON.parse(schedule.destination_path || "{}");
          } catch {
            throw new Error("Invalid SharePoint configuration");
          }

          if (!spConfig.siteId || !spConfig.libraryId) {
            throw new Error("SharePoint site or library not configured");
          }

          const uploadResult = await uploadToSharePoint(
            accessToken,
            spConfig,
            fileName,
            fileContent,
            contentType
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || "SharePoint upload failed");
          }
        }

        // Update history entry on success
        await supabase
          .from("export_history")
          .update({
            status: "success",
            file_name: fileName,
            file_size: fileContent.byteLength,
            completed_at: new Date().toISOString(),
          })
          .eq("id", historyEntry?.id);

        // Update schedule with last run and next run times
        await supabase
          .from("scheduled_exports")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: calculateNextRunTime(schedule.frequency, schedule.scheduled_hour).toISOString(),
          })
          .eq("id", schedule.id);

        results.push({ id: schedule.id, success: true });
        console.log(`Successfully processed schedule: ${schedule.id}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing schedule ${schedule.id}:`, err);

        // Update history entry on failure
        await supabase
          .from("export_history")
          .update({
            status: "failed",
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq("id", historyEntry?.id);

        results.push({ id: schedule.id, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Scheduled export error:", err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
