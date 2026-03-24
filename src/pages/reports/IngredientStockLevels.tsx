import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BatchConfigEditor, BatchConfig, DEFAULT_BATCH_CONFIG } from "@/components/BatchConfigEditor";
import { IngredientAvailabilityPieChart } from "@/components/reports/IngredientAvailabilityPieChart";
import { SubscribeReportDialog } from "@/components/reports/SubscribeReportDialog";

const IngredientStockLevels = () => {
  const { isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const canAccessReporting = isAdmin || isEditor;

  useEffect(() => {
    if (!canAccessReporting) {
      navigate("/");
    }
  }, [canAccessReporting, navigate]);

  if (!canAccessReporting) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/scheduled-exports")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ingredient Stock Levels</h1>
            <p className="text-muted-foreground">
              Overview of current stock levels for all ingredients
            </p>
          </div>
        </div>
        <Button onClick={() => setSubscribeDialogOpen(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Subscribe
        </Button>
      </div>

      <BatchConfigEditor config={batchConfig} onChange={setBatchConfig} />

      <IngredientAvailabilityPieChart batchConfig={batchConfig} />

      <SubscribeReportDialog
        open={subscribeDialogOpen}
        onOpenChange={setSubscribeDialogOpen}
        reportType="ingredient-stock-levels"
        reportTitle="Ingredient Stock Levels"
        currentBatchConfig={batchConfig}
      />
    </div>
  );
};

export default IngredientStockLevels;
