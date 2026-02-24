"use client";

import { useState } from "react";
import { Reference } from "@prisma/client";
import { format } from "date-fns";

import { Pencil, Search, Trash2 } from "lucide-react";

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

import { deleteReference } from "@/actions/module/reference";
import { EntityEditDialog } from "@/components/modules/common/EntityEditDialog";
import { DeleteAlertDialog } from "../common/DeleteAlertDialog";
import { ReferenceForm } from "./reference-form";

interface ReferenceTableProps {
  references: Reference[];
}

export function ReferenceTable({ references }: ReferenceTableProps) {

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filtered = references.filter((ref) => {
    return (
      ref.name.toLowerCase().includes(query.toLowerCase()) ||
      ref.shortName.toLowerCase().includes(query.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    await deleteReference(id);
  };

  return (
    <div className="space-y-4 mt-12">
      {/* Search bar */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by name or short name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S. No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((ref, index) => (
                <TableRow key={ref.id}>
                  <TableCell>{(page - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{ref.name}</TableCell>
                  <TableCell>{ref.shortName}</TableCell>
                  <TableCell>{format(new Date(ref.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <EntityEditDialog
                        title="Edit Reference"
                        initialData={{
                          id: ref.id,
                          name: ref.name,
                          shortName: ref.shortName,
                        }}
                        TriggerButton={
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        FormComponent={({ onClose, initialData }) => (
                          <ReferenceForm onClose={onClose} initialData={initialData} />
                        )}
                      />
                      <DeleteAlertDialog
                        title="Delete Reference"
                        description={`Are you sure you want to delete "${ref.name}"?`}
                        onConfirm={() => handleDelete(ref.id)}
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
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No reference found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-muted-foreground">
          Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
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