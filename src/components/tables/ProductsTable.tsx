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
import { useTableSort } from "@/hooks/useTableSort";
import SortableHeader from "./SortableHeader";

interface ProductsTableProps {
  products: any[];
  loading: boolean;
  isAdmin: boolean;
}

const ProductsTable = ({ products, loading, isAdmin }: ProductsTableProps) => {
  const navigate = useNavigate();
  const { sortedData, sortKey, sortDirection, handleSort } = useTableSort(products, "name");

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products found. {isAdmin && "Click 'Add Product' to create one."}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              label="Product Name"
              sortKey="name"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Category"
              sortKey="category"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Product Level"
              sortKey="product_level"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Skin Type"
              sortKey="skin_type"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Formulator"
              sortKey="formulator"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Manufacturer"
              sortKey="manufacturer"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Test Status"
              sortKey="status_of_tests"
              currentSortKey={sortKey as string}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((product) => (
            <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                <Link 
                  to={`/products/${product.id}`}
                  className="text-primary hover:underline"
                >
                  {product.name}
                </Link>
              </TableCell>
              <TableCell>{product.category || "—"}</TableCell>
              <TableCell>{product.product_level || "—"}</TableCell>
              <TableCell>{product.skin_type || "—"}</TableCell>
              <TableCell>{product.formulator || "—"}</TableCell>
              <TableCell>{product.manufacturer?.name || "—"}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  product.status_of_tests?.toLowerCase().includes('complete') 
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {product.status_of_tests || "Pending"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/products/${product.id}`)}
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

export default ProductsTable;
