"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";

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
  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      shortName: initialData?.shortName || "",
      categoryId: initialData?.categoryId || "",
      sku: initialData?.sku || "PIECE",
      mrp: initialData?.mrp || undefined,
      saleRate: initialData?.saleRate || undefined,
      purchaseRate: initialData?.purchaseRate || undefined,
    },
  });

  // 🔍 ENHANCED DEBUG
  useEffect(() => {
    console.log("=== PRODUCT FORM DETAILED DEBUG ===");
    console.log("1. Total categories prop:", categories);
    console.log("2. Categories count:", categories.length);
    
    // Group by type
    const byType = categories.reduce((acc, cat) => {
      acc[cat.type] = (acc[cat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("3. Categories grouped by type:", byType);
    
    // Check each category
    categories.forEach(cat => {
      console.log(`   - "${cat.name}": type="${cat.type}" (${typeof cat.type})`);
    });
    
    console.log("================================");
  }, [categories]);

  // Filter categories - since Type enum doesn't have PRODUCT, we'll use all categories
  // or filter based on what's actually needed. Based on the error, Type only has:
  // "SERVICE" | "DESIGNATION" | "DISEASE"
  // So we should either use all categories or add a comment explaining the situation
  const productCategories = categories; // Use all categories since Type.PRODUCT doesn't exist

  const onSubmit = async (data: FormData) => {
    const action = initialData
      ? await updateProduct(initialData.id, data)
      : await createProduct(data);

    if ("error" in action) toast.error("Operation failed");
    else toast.success(`Product ${initialData ? "updated" : "created"}`);

    if (!initialData) form.reset();
    onClose();
  };

  // Show warning if no categories available
  const showWarning = categories.length === 0;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* 🚨 WARNING BANNER */}
      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
          <p className="font-semibold text-yellow-800">⚠️ No Categories Available!</p>
          <p className="text-yellow-700 mt-1">
            Please create categories before adding products.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Basic Info</h3>
        <Input placeholder="Product name" {...form.register("name")} />
        <Input placeholder="Short name" {...form.register("shortName")} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Classification</h3>

        <Select
          value={form.watch("categoryId")}
          onValueChange={(val) => form.setValue("categoryId", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {productCategories.length > 0 ? (
              productCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm">
                <p className="text-destructive font-medium">
                  No categories available
                </p>
                <p className="text-muted-foreground text-xs mt-2">
                  Please create categories first
                </p>
              </div>
            )}
          </SelectContent>
        </Select>

        <Select
          value={form.watch("sku")}
          onValueChange={(val) => form.setValue("sku", val as SKUType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select SKU" />
          </SelectTrigger>
          <SelectContent>
            {SKU_OPTIONS.map((sku) => (
              <SelectItem key={sku} value={sku}>
                {sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Pricing (₹)</h3>

        <Input
          type="number"
          placeholder="MRP"
          {...form.register("mrp", { valueAsNumber: true })}
        />
        <Input
          type="number"
          placeholder="Sale Rate"
          {...form.register("saleRate", { valueAsNumber: true })}
        />
        <Input
          type="number"
          placeholder="Purchase Rate"
          {...form.register("purchaseRate", { valueAsNumber: true })}
        />
      </div>

      <DialogFooter>
        <Button type="submit">{initialData ? "Update" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}