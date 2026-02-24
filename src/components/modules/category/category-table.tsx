"use client";

import { useState } from "react";
import { Category } from "@prisma/client";
import { format } from "date-fns";

import { Filter, Pencil, Search, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { deleteCategory } from "@/actions/module/category";
import { EntityEditDialog } from "@/components/modules/common/EntityEditDialog";

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

import { CategoryForm } from "./category-form";
import { DeleteAlertDialog } from "../common/DeleteAlertDialog";
import { toast } from "sonner";

interface CategoryWithCount extends Category {
  _count?: Record<string, number>;
}

interface Props {
  categories: CategoryWithCount[];
}

export function CategoryTable({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("__all__");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const uniqueTypes = [...new Set(categories.map((c) => c.type))];

  // -----------------------------
  // Filtered and Paginated Data
  // -----------------------------
  const filtered = categories.filter((cat) => {
    const matchQuery =
      cat.name.toLowerCase().includes(query.toLowerCase()) ||
      cat.shortName.toLowerCase().includes(query.toLowerCase());

    const matchFilter = filter === "__all__" || !filter ? true : cat.type === filter;

    return matchQuery && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // -----------------------------
  // Delete Handler
  // -----------------------------
  const handleDelete = async (id: string) => {
    try {
      const res = await deleteCategory(id);

      if ("error" in res) {
        toast.error(res.error?.message ?? "Failed to delete category.");
      } else {
        toast.success("Category deleted successfully.");
      }
    } catch {
      toast.error("Cannot delete category. It may be in use.");
    }
  };

  // -----------------------------
  // Calculate total usage count
  // -----------------------------
  function getTotalUsageCount(category: CategoryWithCount) {
    return Object.values(category._count || {}).reduce((acc, val) => acc + val, 0);
  }

  return (
    <div className="space-y-4 mt-12">
      {/* Search & Filter */}
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
          <Select onValueChange={setFilter} value={filter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S. No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>{(page - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.shortName}</TableCell>
                  <TableCell className="capitalize">{category.type}</TableCell>
                  <TableCell>{format(new Date(category.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>{getTotalUsageCount(category)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {/* Edit */}
                      <EntityEditDialog
                        title="Edit Category"
                        initialData={{
                          id: category.id,
                          name: category.name,
                          shortName: category.shortName,
                          type: category.type,
                        }}
                        TriggerButton={
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        FormComponent={({ onClose, initialData }) => (
                          <CategoryForm onClose={onClose} initialData={initialData} />
                        )}
                      />

                      {/* Delete */}
                      <DeleteAlertDialog
                        title="Delete Category"
                        description={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
                        onConfirm={() => handleDelete(category.id)}
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
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  No categories found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-muted-foreground">
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of{" "}
          {filtered.length}
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
