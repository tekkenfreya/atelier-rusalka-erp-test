import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STAGES = [
  "Planned",
  "In Formulation",
  "Formula Ready",
  "Sample Ready",
  "In Testing",
  "Ready For Manufacturing",
] as const;

type Stage = typeof STAGES[number];

interface ProjectCard {
  id: string;
  product_id: string;
  stage: Stage;
  sort_order: number;
  product_name: string;
  product_category: string | null;
}

const STAGE_COLORS: Record<Stage, string> = {
  "Planned": "border-t-red-500",
  "In Formulation": "border-t-orange-500",
  "Formula Ready": "border-t-yellow-500",
  "Sample Ready": "border-t-blue-400",
  "In Testing": "border-t-blue-600",
  "Ready For Manufacturing": "border-t-green-600",
};

const StartupProjectCompletion = () => {
  const { isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canAccessReporting = isAdmin || isEditor;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [moveCardId, setMoveCardId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [addToStage, setAddToStage] = useState<Stage>("Planned");

  useEffect(() => {
    if (!canAccessReporting) navigate("/");
  }, [canAccessReporting, navigate]);

  // Fetch cards with product names
  const { data: cards = [] } = useQuery({
    queryKey: ["startup-project-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_project_cards")
        .select("id, product_id, stage, sort_order, products(name, category)")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        stage: row.stage as Stage,
        sort_order: row.sort_order,
        product_name: row.products?.name ?? "Unknown Product",
        product_category: row.products?.category ?? null,
      })) as ProjectCard[];
    },
    enabled: canAccessReporting,
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: canAccessReporting,
  });

  // Products not yet on the board
  const assignedProductIds = new Set(cards.map((c) => c.product_id));
  const availableProducts = allProducts.filter((p) => !assignedProductIds.has(p.id));

  // Add card
  const addCardMutation = useMutation({
    mutationFn: async ({ productId, stage }: { productId: string; stage: Stage }) => {
      const stageCards = cards.filter((c) => c.stage === stage);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("startup_project_cards").insert({
        product_id: productId,
        stage,
        sort_order: stageCards.length,
        created_by: user?.id ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-project-cards"] });
      toast.success("Card added");
    },
    onError: () => toast.error("Failed to add card"),
  });

  // Move card to different stage
  const moveCardMutation = useMutation({
    mutationFn: async ({ cardId, newStage }: { cardId: string; newStage: Stage }) => {
      const { error } = await supabase
        .from("startup_project_cards")
        .update({ stage: newStage })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-project-cards"] });
    },
    onError: () => toast.error("Failed to move card"),
  });

  // Delete card
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("startup_project_cards")
        .delete()
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-project-cards"] });
      toast.success("Card removed");
    },
    onError: () => toast.error("Failed to remove card"),
  });

  const handleAddCard = () => {
    if (!selectedProductId) return;
    addCardMutation.mutate({ productId: selectedProductId, stage: addToStage });
    setAddDialogOpen(false);
    setSelectedProductId("");
  };

  const openAddDialog = (stage: Stage) => {
    setAddToStage(stage);
    setSelectedProductId("");
    setAddDialogOpen(true);
  };

  if (!canAccessReporting) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/scheduled-exports")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Startup Project Completion</h1>
          <p className="text-muted-foreground">
            Track product development stages from planning to manufacturing
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const stageCards = cards
            .filter((c) => c.stage === stage)
            .sort((a, b) => a.product_name.localeCompare(b.product_name));
          return (
            <div key={stage} className="flex flex-col min-w-[200px] w-[200px]">
              <Card className={`flex-1 border-t-4 ${STAGE_COLORS[stage]}`}>
                <CardHeader className="pb-2 px-3 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{stage}</CardTitle>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {stageCards.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2 min-h-[120px]">
                  {stageCards.map((card) => (
                    <div
                      key={card.id}
                      className="group relative rounded-md border bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">
                            {card.product_name}
                          </span>
                          {card.product_category && (
                            <span className="text-xs text-muted-foreground">
                              {card.product_category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setDeleteCardId(card.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Stage mover */}
                      <div className="mt-2">
                        <Select
                          value={card.stage}
                          onValueChange={(val) =>
                            moveCardMutation.mutate({ cardId: card.id, newStage: val as Stage })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => openAddDialog(stage)}
                    disabled={availableProducts.length === 0}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Card
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Add Card Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Card to "{addToStage}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All products are already on the board.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={!selectedProductId}>
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCardId} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Card</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from the board. You can re-add it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCardId) deleteCardMutation.mutate(deleteCardId);
                setDeleteCardId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StartupProjectCompletion;
