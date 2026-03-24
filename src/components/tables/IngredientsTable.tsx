import { useNavigate, Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useTableSort } from "@/hooks/useTableSort";
import SortableHeader from "./SortableHeader";

interface IngredientsTableProps {
  ingredients: any[];
  loading: boolean;
  isAdmin: boolean;
}

const IngredientsTable = ({ ingredients, loading, isAdmin }: IngredientsTableProps) => {
  const navigate = useNavigate();
  const { sortedData, sortKey, sortDirection, handleSort } = useTableSort(ingredients, "name");

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No ingredients found. {isAdmin && "Click 'Add Ingredient' to create one."}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              label="Name"
              sortKey="name"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Type"
              sortKey="type"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="ID"
              sortKey="ingredient_id"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Function"
              sortKey="function"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Supplier"
              sortKey="supplier"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Last Order"
              sortKey="last_order_date"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Stock"
              sortKey="amount_in_stock"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((ingredient) => (
            <TableRow key={ingredient.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                <Link 
                  to={`/ingredients/${ingredient.id}`}
                  className="text-primary hover:underline"
                >
                  {ingredient.name}
                </Link>
              </TableCell>
              <TableCell>{ingredient.type || "Ingredient"}</TableCell>
              <TableCell className="font-mono text-xs">{ingredient.ingredient_id || "—"}</TableCell>
              <TableCell className="text-sm">{ingredient.function || "—"}</TableCell>
              <TableCell>{ingredient.supplier?.name || "—"}</TableCell>
              <TableCell>
                {ingredient.last_order_date 
                  ? format(new Date(ingredient.last_order_date), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  (ingredient.amount_in_stock || 0) > 0
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {ingredient.amount_in_stock || 0} {ingredient.quantity_unit || 'g'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/ingredients/${ingredient.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default IngredientsTable;
