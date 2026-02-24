"use client";

import { useState } from "react";
import { Product, Category } from "@prisma/client";
import { format } from "date-fns";

import { Filter, Pencil, Search, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { deleteProduct } from "@/actions/module/product";
import { EntityEditDialog } from "@/components/modules/common/EntityEditDialog";
import { DeleteAlertDialog } from "@/components/modules/common/DeleteAlertDialog";
import { ProductForm } from "./product-form";
import { PRODUCT_CATEGORY_TYPES } from "@/lib/type";

interface Props {
  products: (Product & { category: Category; })[];
  categories: Category[];
}

export function ProductTable({ products, categories }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredCategories = categories.filter((cat) =>
    PRODUCT_CATEGORY_TYPES.includes(cat.type)
  );

  const filtered = products.filter((product) => {
    const matchesQuery =
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.shortName.toLowerCase().includes(query.toLowerCase());

    const matchesCategory =
      filter === "__all__" || !filter ? true : product.categoryId === filter;

    return matchesQuery && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  return (
    <div className="space-y-4 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name or short name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select onValueChange={setFilter} value={filter || "__all__"}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>  
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S. No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>MRP</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell>{(page - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.shortName}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>₹{product.mrp}</TableCell>
                  <TableCell>{format(new Date(product.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <EntityEditDialog
                        title="Edit Product"
                        initialData={{
                          id: product.id,
                          name: product.name,
                          shortName: product.shortName,
                          categoryId: product.categoryId,
                          sku: product.sku,
                          mrp: product.mrp,
                          saleRate: product.saleRate,
                          purchaseRate: product.purchaseRate,
                        }}
                        TriggerButton={
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        FormComponent={({ onClose, initialData }) => (
                          <ProductForm
                            initialData={initialData}
                            categories={categories}
                            onClose={onClose}
                          />
                        )}
                      />

                      <DeleteAlertDialog
                        title="Delete Product"
                        description={`Are you sure you want to delete "${product.name}"?`}
                        onConfirm={() => handleDelete(product.id)}
                        TriggerElement={
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-muted-foreground">
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of{" "}
          {filtered.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
