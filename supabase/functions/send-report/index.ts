import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  moisturizerVolume: 50,
  moisturizerQuantity: 100,
  cleanserVolume: 150,
  cleanserQuantity: 100,
  serumVolume: 30,
  serumQuantity: 100,
  foamingShowerGelVolume: 250,
  foamingShowerGelQuantity: 100,
};

interface ProductWithPercentage {
  category: string | null;
  percentage: string;
}

interface IngredientData {
  name: string;
  amountInStock: number;
  lastOrderQuantity: number;
  supplierId: string | null;
  products: ProductWithPercentage[];
}

const parsePercentage = (value: string): number => {
  const parsed = parseFloat(String(value).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
};

const calculateTotalNeeded = (
  products: ProductWithPercentage[],
  config: BatchConfig
): number => {
  let total = 0;
  products.forEach((product) => {
    const percentage = parsePercentage(product.percentage);
    if (percentage === 0) return;

    const category = product.category;
    let volume = 0;
    let quantity = 0;

    if (category === "Moisturizer") {
      volume = config.moisturizerVolume;
      quantity = config.moisturizerQuantity;
    } else if (category === "Cleanser") {
      volume = config.cleanserVolume;
      quantity = config.cleanserQuantity;
    } else if (category === "Serum") {
      volume = config.serumVolume;
      quantity = config.serumQuantity;
    } else if (category === "Foaming Shower Gel") {
      volume = config.foamingShowerGelVolume;
      quantity = config.foamingShowerGelQuantity;
    }

    total += (percentage / 100) * volume * quantity;
  });
  return total;
};


const COLORS = {
  black: { hex: "#1a1a1a", label: "No Stock/Orders" },
  darkRed: { hex: "#8b1a1a", label: "Stock+Ordered ≤ 50%" },
  red: { hex: "#d94343", label: "Stock ≤ 50%" },
  lightOrange: { hex: "#f9a858", label: "Stock+Ordered > 50%" },
  orange: { hex: "#e8700a", label: "Stock > 50%" },
  lightGreen: { hex: "#4ade80", label: "Stock+Ordered ≥ Needed" },
  green: { hex: "#22874a", label: "Stock ≥ Needed" },
};

const getStatusColor = (stock: number, ordered: number, needed: number): { hex: string; label: string } => {
  if (stock === 0 && ordered === 0) return COLORS.black;
  const total = stock + ordered;
  const hasOrdered = ordered > 0;

  if (hasOrdered) {
    if (total >= needed) return COLORS.lightGreen;
    if (total > needed * 0.5) return COLORS.lightOrange;
    return COLORS.darkRed;
  }

  if (stock >= needed) return COLORS.green;
  if (stock > needed * 0.5) return COLORS.orange;
  return COLORS.red;
};

const getStatusLabel = (stock: number, ordered: number, needed: number): string => {
  const color = getStatusColor(stock, ordered, needed);
  return color.label;
};

// Generate email-compatible HTML chart (stacked bar + legend)
const generateChartHtml = (items: { name: string; color: string }[]): string => {
  if (items.length === 0) return "";

  // Count items per color category
  const colorCounts: Record<string, number> = {};
  const allColors = Object.values(COLORS);
  allColors.forEach((c) => { colorCounts[c.hex] = 0; });
  items.forEach((item) => { colorCounts[item.color] = (colorCounts[item.color] || 0) + 1; });

  const total = items.length;

  // Build stacked bar segments using table cells (most email-client compatible)
  let barCells = "";
  allColors.forEach((c) => {
    const count = colorCounts[c.hex] || 0;
    if (count === 0) return;
    const widthPercent = ((count / total) * 100).toFixed(1);
    barCells += `<td style="width: ${widthPercent}%; background-color: ${c.hex}; height: 32px; border: none; padding: 0;"></td>`;
  });

  // Build legend rows using table for email compatibility
  let legendCells = "";
  allColors.forEach((c) => {
    const count = colorCounts[c.hex] || 0;
    legendCells += `
      <td style="padding: 4px 8px 4px 0; white-space: nowrap; font-size: 11px; color: #555; border: none;">
        <table cellpadding="0" cellspacing="0" border="0" style="display: inline-table;"><tr>
          <td style="width: 12px; height: 12px; background: ${c.hex}; border-radius: 2px; border: none;"></td>
          <td style="padding-left: 4px; font-size: 11px; color: #555; border: none;">${c.label} (${count})</td>
        </tr></table>
      </td>`;
  });

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; color: #333; text-align: center;">Ingredient Availability</h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius: 6px; overflow: hidden; border-collapse: collapse;">
        <tr>${barCells}</tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 12px auto 0; border-collapse: collapse;">
        <tr>${legendCells}</tr>
      </table>
    </div>
  `;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      throw new Error("subscriptionId is required");
    }

    console.log(`[send-report] Triggered for subscription ${subscriptionId} by user ${user.id}`);

    // Fetch subscription details
    const { data: subscription, error: subError } = await supabase
      .from("report_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found or access denied");
    }

    console.log(`[send-report] Report type: ${subscription.report_type}, email: ${subscription.email}`);

    const batchConfig: BatchConfig = subscription.include_batch_config && subscription.batch_config
      ? (subscription.batch_config as BatchConfig)
      : DEFAULT_BATCH_CONFIG;

    // Fetch ingredients with product data
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("id, name, amount_in_stock, last_order_quantity, supplier_id")
      .order("name");

    if (ingredientsError) throw ingredientsError;

    const ingredientsWithProducts: IngredientData[] = await Promise.all(
      (ingredients || []).map(async (ingredient: any) => {
        const { data: productIngredients } = await supabase
          .from("product_ingredients")
          .select("percentage, products:product_id (category)")
          .eq("ingredient_id", ingredient.id);

        const products: ProductWithPercentage[] = (productIngredients || [])
          .map((pi: any) => ({
            category: pi.products?.category || null,
            percentage: pi.percentage,
          }))
          .filter((p: ProductWithPercentage) => p.category !== null);

        return {
          name: ingredient.name,
          amountInStock: ingredient.amount_in_stock || 0,
          lastOrderQuantity: ingredient.last_order_quantity || 0,
          supplierId: ingredient.supplier_id,
          products,
        };
      })
    );

    // Filter to only ingredients used in products
    let filtered = ingredientsWithProducts.filter((i) => i.products.length > 0);

    // Apply supplier filter if set
    if (subscription.filter_supplier_id) {
      filtered = filtered.filter((i) => i.supplierId === subscription.filter_supplier_id);
    }

    // Build pie chart data and HTML table rows
    const pieChartItems: { name: string; color: string }[] = [];
    const rows = filtered.map((ingredient) => {
      const needed = calculateTotalNeeded(ingredient.products, batchConfig);
      const stock = ingredient.amountInStock;
      const ordered = ingredient.lastOrderQuantity;
      const statusLabel = getStatusLabel(stock, ordered, needed);
      const status = getStatusColor(stock, ordered, needed);

      pieChartItems.push({ name: ingredient.name, color: status.hex });

      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px;">${ingredient.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; text-align: right;">${needed.toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; text-align: right;">${stock.toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; text-align: right;">${ordered.toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px;">
            <span style="color: ${status.hex}; font-weight: 600;">${statusLabel}</span>
          </td>
        </tr>
      `;
    }).join("");

    // Sort pie chart items by status priority (most critical first)
    pieChartItems.sort((a, b) => {
      const colorOrder = [COLORS.black.hex, COLORS.darkRed.hex, COLORS.red.hex, COLORS.lightOrange.hex, COLORS.orange.hex, COLORS.lightGreen.hex, COLORS.green.hex];
      return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
    });

    const pieChartHtml = generateChartHtml(pieChartItems);

    // Get supplier name if filtered
    let supplierNote = "";
    if (subscription.filter_supplier_id) {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", subscription.filter_supplier_id)
        .single();
      if (supplier) {
        supplierNote = `<p style="color: #666; font-size: 14px;">Filtered by supplier: <strong>${supplier.name}</strong></p>`;
      }
    }

    const reportTitle = subscription.report_type
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Summary counts
    const criticalCount = filtered.filter((i) => {
      const needed = calculateTotalNeeded(i.products, batchConfig);
      const stock = i.amountInStock;
      const ordered = i.lastOrderQuantity;
      return (stock === 0 && ordered === 0) ||
        (!ordered && stock <= needed * 0.5) ||
        (ordered > 0 && stock + ordered <= needed * 0.5);
    }).length;

    const warningCount = filtered.filter((i) => {
      const needed = calculateTotalNeeded(i.products, batchConfig);
      const stock = i.amountInStock;
      const ordered = i.lastOrderQuantity;
      const total = stock + ordered;
      return (ordered > 0 ? (total > needed * 0.5 && total < needed) : (stock > needed * 0.5 && stock < needed));
    }).length;

    const okCount = filtered.length - criticalCount - warningCount;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: #1a1a2e; color: white; padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px;">${reportTitle}</h1>
              <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Generated on ${dateStr}</p>
            </div>
            
            <div style="padding: 24px 32px;">
              ${supplierNote}

              ${pieChartHtml}
              
              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; padding: 12px; background: #f0fdf4; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #22874a;">${okCount}</div>
                  <div style="font-size: 12px; color: #666;">Sufficient</div>
                </div>
                <div style="flex: 1; padding: 12px; background: #fff7ed; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #e8700a;">${warningCount}</div>
                  <div style="font-size: 12px; color: #666;">Warning</div>
                </div>
                <div style="flex: 1; padding: 12px; background: #fef2f2; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #d94343;">${criticalCount}</div>
                  <div style="font-size: 12px; color: #666;">Critical</div>
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #666; border-bottom: 2px solid #eee;">Ingredient</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #666; border-bottom: 2px solid #eee;">Needed</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #666; border-bottom: 2px solid #eee;">In Stock</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #666; border-bottom: 2px solid #eee;">Ordered</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #666; border-bottom: 2px solid #eee;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 6px; font-size: 12px; color: #888;">
                <strong>Batch Configuration:</strong>
                Moisturizer ${batchConfig.moisturizerVolume}ml × ${batchConfig.moisturizerQuantity} |
                Cleanser ${batchConfig.cleanserVolume}ml × ${batchConfig.cleanserQuantity} |
                Serum ${batchConfig.serumVolume}ml × ${batchConfig.serumQuantity} |
                Foaming Shower Gel ${batchConfig.foamingShowerGelVolume}ml × ${batchConfig.foamingShowerGelQuantity}
              </div>
            </div>
          </div>
          <p style="text-align: center; font-size: 12px; color: #999; margin-top: 16px;">
            This is an automated report from your subscription. Manage your subscriptions in the app.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "Reports <onboarding@resend.dev>",
      to: [subscription.email],
      subject: `${reportTitle} Report — ${now.toLocaleDateString("en-GB")}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("[send-report] Email send error:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    // Update last_run_at
    await supabase
      .from("report_subscriptions")
      .update({ last_run_at: now.toISOString() })
      .eq("id", subscriptionId);

    console.log(`[send-report] Report sent successfully to ${subscription.email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Report sent to ${subscription.email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-report] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
