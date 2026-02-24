"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@/schemas/module";
import { z } from "zod";
import { createCategory, updateCategory } from "@/actions/module/category";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Type } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CategoryFormValues = z.infer<typeof categorySchema>;

interface Props {
  initialData?: {
    id: string;
    name: string;
    shortName: string;
    type: Type;
  };
  onClose: () => void;
}

export function CategoryForm({ initialData, onClose }: Props) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      shortName: initialData?.shortName || "",
      type: initialData?.type ?? undefined,
    },
  });

  const handleError = (error: unknown) => {
    const msg =
      error && typeof error === "object" && "message" in error
        ? String((error as Record<string, unknown>).message)
        : "Validation error";
    toast.error(msg);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    if (initialData) {
      const res = await updateCategory(initialData.id, data);

      if (res?.error) handleError(res.error);
      else toast.success("Category updated");
    } else {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("shortName", data.shortName);
      fd.append("type", data.type);

      const res = await createCategory(fd);

      if (res?.error) handleError(res.error);
      else toast.success("Category created");
    }

    form.reset();
    onClose();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input placeholder="Category name" {...form.register("name")} />

      <Input placeholder="Short name" {...form.register("shortName")} />

      <Select
        value={form.watch("type") || ""}
        onValueChange={(value) => form.setValue("type", value as CategoryFormValues["type"])}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PRODUCT">Product</SelectItem>
          <SelectItem value="SERVICE">Service</SelectItem>
          <SelectItem value="DESIGNATION">Designation</SelectItem>
          <SelectItem value="DISEASE">Disease</SelectItem>
        </SelectContent>
      </Select>

      <DialogFooter>
        <Button type="submit">{initialData ? "Update" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
