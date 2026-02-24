// File: src/components/modules/common/product-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UniversalSearch } from "@/components/modules/common/universal-search";
import { searchProducts } from "@/actions/module/billing";
import { AlertCircle, PackageCheck } from "lucide-react";

// ── Schema (batch fields removed) ────────────────────────────────────────────
const productItemSchema = z.object({
  productId:      z.string().min(1, "Product is required"),
  productName:    z.string().min(1),
  quantity:       z.number().min(1, "Quantity must be at least 1"),
  mrp:            z.number().min(0),
  saleRate:       z.number().min(0),
  discount:       z.number().min(0),
  taxPercent:     z.number().min(0).max(100),
  availableStock: z.number().optional(),
});

type ProductItemInput = z.infer<typeof productItemSchema>;

interface ProductFormProps {
  onSubmit:     (data: ProductItemInput) => void;
  onClose:      () => void;
  initialData?: Partial<ProductItemInput>;
  hideTaxInput?: boolean;
}

interface Product {
  id:           string;
  name:         string;
  sku:          string;
  mrp:          number;
  saleRate:     number;
  currentStock: number;
  gst?:         number;
}

export function BillingProductForm({
  onSubmit,
  onClose,
  initialData,
}: ProductFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const form = useForm<ProductItemInput>({
    resolver: zodResolver(productItemSchema),
    defaultValues: initialData || {
      productId:      "",
      productName:    "",
      quantity:       1,
      mrp:            0,
      saleRate:       0,
      discount:       0,
      taxPercent:     0,
      availableStock: 0,
    },
  });

  useEffect(() => {
    if (initialData) form.reset(initialData);
  }, [initialData, form]);

  // ── Product selected from search ──────────────────────────────────────────
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    form.setValue("productId",      product.id);
    form.setValue("productName",    product.name);
    form.setValue("mrp",            product.mrp);
    form.setValue("saleRate",       product.saleRate);
    form.setValue("availableStock", product.currentStock);
    form.setValue("taxPercent",     product.gst ?? 0);
    // Reset quantity to 1 on new product selection
    form.setValue("quantity",       1);
    form.setValue("discount",       0);
  };

  // ── Watchers for live totals ──────────────────────────────────────────────
  const quantity       = form.watch("quantity");
  const saleRate       = form.watch("saleRate");
  const discount       = form.watch("discount");
  const availableStock = form.watch("availableStock");

  const grossAmount    = saleRate * quantity;
  const totalAmount    = Math.max(0, grossAmount - discount);
  const isOverStock    = availableStock !== undefined && quantity > availableStock;
  const stockOk        = availableStock !== undefined && availableStock > 0;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleFormSubmit = (data: ProductItemInput) => {
    if (isOverStock) {
      form.setError("quantity", {
        message: `Only ${availableStock} units available`,
      });
      return;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">

      {/* ── Product Search ───────────────────────────────────────────────── */}
      <div>
        <UniversalSearch
          searchFunction={searchProducts}
          onSelect={handleProductSelect}
          placeholder="Type product name..."
          displayKeys={["name", "currentStock", "sku"]}
          renderResult={(product: Product) => (
            <div className="flex justify-between items-center w-full gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  MRP: ₹{product.mrp} · Sale: ₹{product.saleRate}
                </p>
              </div>
              <Badge
                variant={product.currentStock > 0 ? "default" : "destructive"}
                className="shrink-0 text-xs"
              >
                {product.currentStock > 0 ? `${product.currentStock} ${product.sku}` : "Out of stock"}
              </Badge>
            </div>
          )}
          label="Search Product"
          required
          minChars={2}
        />
        {form.formState.errors.productId && (
          <p className="text-xs text-red-500 mt-1">
            {form.formState.errors.productId.message}
          </p>
        )}
      </div>

      {/* ── Selected Product Info Card ───────────────────────────────────── */}
      {selectedProduct && (
        <div className={`rounded-lg border px-4 py-3 space-y-2 ${
          stockOk
            ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
            : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{selectedProduct.name}</p>
            <Badge variant={stockOk ? "default" : "destructive"} className="text-xs">
              {stockOk ? `${availableStock} in stock` : "Out of stock"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="uppercase tracking-wide font-medium mb-0.5">MRP</p>
              <p className="text-foreground font-semibold">₹{selectedProduct.mrp}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide font-medium mb-0.5">Sale Rate</p>
              <p className="text-foreground font-semibold">₹{selectedProduct.saleRate}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide font-medium mb-0.5">Unit</p>
              <p className="text-foreground font-semibold">{selectedProduct.sku}</p>
            </div>
          </div>

          {/* Stock warning */}
          {!stockOk && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              This product is out of stock and cannot be billed.
            </div>
          )}
        </div>
      )}

      {/* ── Quantity & Pricing ───────────────────────────────────────────── */}
      {selectedProduct && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min={1}
                max={availableStock ?? 9999}
                {...form.register("quantity", { valueAsNumber: true })}
                className={isOverStock ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {form.formState.errors.quantity ? (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.quantity.message}
                </p>
              ) : availableStock !== undefined ? (
                <p className={`text-xs mt-1 ${isOverStock ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {isOverStock
                    ? `⚠ Exceeds stock (max ${availableStock})`
                    : `Available: ${availableStock} ${selectedProduct.sku}`}
                </p>
              ) : null}
            </div>

            {/* MRP (read-only) */}
            <div>
              <Label>MRP</Label>
              <Input
                type="number"
                placeholder="MRP"
                step="0.01"
                {...form.register("mrp", { valueAsNumber: true })}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Sale Rate */}
            <div>
              <Label>Sale Rate *</Label>
              <Input
                type="number"
                placeholder="Sale Rate"
                step="0.01"
                {...form.register("saleRate", { valueAsNumber: true })}
              />
            </div>

            {/* Discount */}
            <div>
              <Label>Discount (₹)</Label>
              <Input
                type="number"
                placeholder="Discount"
                step="0.01"
                min={0}
                {...form.register("discount", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* ── Total strip ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackageCheck className="w-4 h-4 text-blue-500" />
              <span>{quantity} × ₹{saleRate.toFixed(2)}{discount > 0 ? ` − ₹${discount.toFixed(2)}` : ""}</span>
            </div>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
        </>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedProduct || !stockOk}
        >
          {initialData?.productId ? "Update" : "Add"} Product
        </Button>
      </div>
    </form>
  );
}