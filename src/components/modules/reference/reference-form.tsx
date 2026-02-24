// components/category/category-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { referenceSchema } from "@/schemas/module";
import { z } from "zod";
import { createReference, updateReference } from "@/actions/module/reference";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type FormData = z.infer<typeof referenceSchema>;

interface Props {
  initialData?: {
    id: string;
    name: string;
    shortName: string;
  };
  onClose: () => void;
}

export function ReferenceForm({ initialData, onClose }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(referenceSchema),
    defaultValues: {
      name: initialData?.name || "",
      shortName: initialData?.shortName || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (initialData) {
      const res = await updateReference(initialData.id, data);
      if ("error" in res) toast.error("Update failed");
      else toast.success("Reference updated");
    } else {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("shortName", data.shortName);

      const res = await createReference(formData);
      if ("error" in res) toast.error("Create failed");
      else toast.success("Reference created");
    }

    form.reset();
    onClose();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input placeholder="Reference name" {...form.register("name")} />
      <Input placeholder="Short name" {...form.register("shortName")} />
      <DialogFooter>
        <Button type="submit">{initialData ? "Update" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
