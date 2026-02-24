"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { serviceSchema } from "@/schemas/module";
import { createService, updateService } from "@/actions/module/service";
import { Category, Type } from "@prisma/client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";

type FormData = z.infer<typeof serviceSchema>;

interface Props {
  initialData?: {
    id: string;
    name: string;
    shortName: string;
    description?: string | null;
    categoryId: string;
  };
  categories: Category[];
  onClose: () => void;
}

export function ServiceForm({ initialData, categories, onClose }: Props) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialData?.name || "",
      shortName: initialData?.shortName || "",
      description: initialData?.description || "",
      categoryId: initialData?.categoryId || "",
    },
  });

  // Filter only SERVICE type categories
  const serviceCategories = categories.filter(
    (cat) => cat.type === Type.SERVICE
  );

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (initialData) {
        const res = await updateService(initialData.id, data);
        
        if ("error" in res && res.error) {
          // Handle different error types
          if ("message" in res.error) {
            setError(res.error.message);
          } else {
            setError("Failed to update service. Please check all fields.");
          }
        } else {
          setSuccess("Service updated successfully!");
          setTimeout(() => {
            form.reset();
            onClose();
          }, 1500);
        }
      } else {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("shortName", data.shortName);
        formData.append("description", data.description ?? "");
        formData.append("categoryId", data.categoryId);

        const res = await createService(formData);
        
        if ("error" in res && res.error) {
          // Handle different error types
          if ("message" in res.error) {
            setError(res.error.message);
          } else {
            setError("Failed to create service. Please check all fields.");
          }
        } else {
          setSuccess("Service created successfully!");
          setTimeout(() => {
            form.reset();
            onClose();
          }, 1500);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Service Name
        </Label>
        <Input
          id="name"
          placeholder="Enter service name"
          disabled={isSubmitting}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortName" className="text-sm font-medium">
          Short Name
        </Label>
        <Input
          id="shortName"
          placeholder="Enter short name"
          disabled={isSubmitting}
          {...form.register("shortName")}
        />
        {form.formState.errors.shortName && (
          <p className="text-sm text-destructive">
            {form.formState.errors.shortName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Enter service description"
          rows={3}
          disabled={isSubmitting}
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </Label>
        <Select
          onValueChange={(val) => form.setValue("categoryId", val)}
          value={form.watch("categoryId")}
          disabled={isSubmitting}
        >
          <SelectTrigger id="categoryId">
            <SelectValue placeholder="Select service category" />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.length > 0 ? (
              serviceCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No service categories available
              </div>
            )}
          </SelectContent>
        </Select>
        {form.formState.errors.categoryId && (
          <p className="text-sm text-destructive">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : initialData
            ? "Update Service"
            : "Create Service"}
        </Button>
      </DialogFooter>
    </form>
  );
}