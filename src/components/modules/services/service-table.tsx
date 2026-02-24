"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Category, Service, Type } from "@prisma/client";

import { Filter, Pencil, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { deleteService } from "@/actions/module/service";
import { EntityEditDialog } from "@/components/modules/common/EntityEditDialog";
import { DeleteAlertDialog } from "@/components/modules/common/DeleteAlertDialog";

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

import { ServiceForm } from "./service-form";

interface ServiceWithRelations extends Service {
  category: Category;
  _count?: {
    appointments: number;
  };
}

interface Props {
  services: ServiceWithRelations[];
  categories: Category[];
}

export function ServiceTable({ services, categories }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // Filter only SERVICE type categories
  const serviceCategories = categories.filter(
    (cat) => cat.type === Type.SERVICE
  );

  // Filter services based on search query and category filter
  const filtered = services.filter((service) => {
    // Only show services with SERVICE category
    if (service.category.type !== Type.SERVICE) return false;

    // Match search query
    const matchQuery =
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.shortName.toLowerCase().includes(query.toLowerCase());

    // Match category filter
    const matchFilter =
      filter === "__all__" || !filter ? true : service.categoryId === filter;

    return matchQuery && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleDelete = async (id: string) => {
    await deleteService(id);
  };

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
          <Select onValueChange={setFilter} value={filter || "__all__"}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {serviceCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
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
              <TableHead className="w-16">S. No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((service, index) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                      {service.shortName}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {service.description || (
                      <span className="text-muted-foreground italic">No description</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {service.category.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {service._count?.appointments || 0} appointments
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(service.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <EntityEditDialog
                        title="Edit Service"
                        initialData={service}
                        TriggerButton={
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        FormComponent={({ onClose }) => (
                          <ServiceForm
                            onClose={onClose}
                            initialData={{
                              id: service.id,
                              name: service.name,
                              shortName: service.shortName,
                              description: service.description,
                              categoryId: service.categoryId,
                            }}
                            categories={categories}
                          />
                        )}
                      />
                      <DeleteAlertDialog
                        title="Delete Service"
                        description={`Are you sure you want to delete "${service.name}"? This action cannot be undone.`}
                        onConfirm={() => handleDelete(service.id)}
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
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  {query || filter ? (
                    <div className="space-y-2">
                      <p className="font-medium">No services found</p>
                      <p className="text-sm">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">No services yet</p>
                      <p className="text-sm">
                        Get started by adding your first service
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of{" "}
            {filtered.length} {filtered.length === 1 ? "service" : "services"}
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
            <div className="flex items-center gap-1">
              <span className="text-sm px-3 py-1">
                Page {page} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}