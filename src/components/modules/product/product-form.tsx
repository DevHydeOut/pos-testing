// File: src/components/modules/product/product-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { SKUType, Category } from "@prisma/client";
import { productSchema } from "@/schemas/module";
import { createProduct, updateProduct } from "@/actions/module/product";

type FormData = z.infer<typeof productSchema>;

interface Props {
  initialData?: {
    id: string;
    name: string;
    shortName: string;
    categoryId: string;
    sku: SKUType;
    mrp: number;
    saleRate: number;
    purchaseRate: number;
  };
  categories: Category[];
  onClose: () => void;
}

const SKU_OPTIONS: SKUType[] = ["TUBE", "STRIP", "PIECE", "PACK", "SACHET", "BOTTLE"];

export function ProductForm({ initialData, categories, onClose }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name:         initialData?.name         ?? "",
      shortName:    initialData?.shortName    ?? "",
      categoryId:   initialData?.categoryId   ?? "",
      sku:          initialData?.sku          ?? "PIECE",
      mrp:          initialData?.mrp          ?? undefined,
      saleRate:     initialData?.saleRate     ?? undefined,
      purchaseRate: initialData?.purchaseRate ?? undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    const action = initialData
      ? await updateProduct(initialData.id, data)
      : await createProduct(data);

    if ("error" in action && action.error) {
      const err = action.error;

      if (typeof err === "string") {
        toast.error(err);
        return;
      }
      if (typeof err === "object" && "message" in err) {
        toast.error((err as { message: string }).message);
        return;
      }
      if (typeof err === "object" && "formErrors" in err) {
        const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
        const msg =
          flat.formErrors?.[0] ??
          Object.values(flat.fieldErrors ?? {})?.[0]?.[0] ??
          "Validation failed.";
        toast.error(msg);
        return;
      }

      toast.error("Operation failed. Please try again.");
      return;
    }

    toast.success(`Product ${initialData ? "updated" : "created"} successfully.`);
    if (!initialData) reset();
    onClose();
  };

  const onInvalid = (errs: typeof errors) => {
    const firstError = Object.values(errs)?.[0]?.message;
    if (firstError) toast.error(String(firstError));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">

      {categories.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
          <p className="font-semibold text-yellow-800">No Categories Available!</p>
          <p className="text-yellow-700 mt-1">Please create categories before adding products.</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Basic Info</h3>
        <div>
          <Input placeholder="Product name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Input placeholder="Short name" {...register("shortName")} />
          {errors.shortName && <p className="text-xs text-red-500 mt-1">{errors.shortName.message}</p>}
        </div>
      </div>

      {/* Classification */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Classification</h3>

        <div>
          <Select value={watch("categoryId")} onValueChange={(val) => setValue("categoryId", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
              )}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
        </div>

        <div>
          <Select value={watch("sku")} onValueChange={(val) => setValue("sku", val as SKUType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select SKU" />
            </SelectTrigger>
            <SelectContent>
              {SKU_OPTIONS.map((sku) => (
                <SelectItem key={sku} value={sku}>{sku}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Pricing ($)</h3>
        <div className="grid grid-cols-3 gap-3">

          {/* MRP */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">MRP *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                className="pl-7"
                {...register("mrp", { valueAsNumber: true })} />
            </div>
            {errors.mrp && <p className="text-xs text-red-500">{errors.mrp.message}</p>}
          </div>

          {/* Sale Rate */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Sale Rate *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                className="pl-7"
                {...register("saleRate", { valueAsNumber: true })} />
            </div>
            {errors.saleRate && <p className="text-xs text-red-500">{errors.saleRate.message}</p>}
          </div>

          {/* Purchase Rate */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Purchase Rate *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                className="pl-7"
                {...register("purchaseRate", { valueAsNumber: true })} />
            </div>
            {errors.purchaseRate && <p className="text-xs text-red-500">{errors.purchaseRate.message}</p>}
          </div>

        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? initialData ? "Updating..." : "Saving..."
            : initialData ? "Update" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}