import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface MethodStep {
  id: string;
  step_number: string;
  step_type: "step" | "notes";
  content: string;
  sort_order: number;
}

interface ProductMethodProps {
  steps: MethodStep[];
}

export const ProductMethod = ({ steps }: ProductMethodProps) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <CardTitle className="text-lg">Method</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex gap-4 ${
                step.step_type === "notes"
                  ? "bg-muted/50 rounded-lg p-4 border-l-4 border-muted-foreground/30"
                  : ""
              }`}
            >
              {step.step_type === "step" ? (
                <>
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                    {step.step_number}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-base whitespace-pre-wrap">{step.content}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{step.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
