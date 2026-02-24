"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UniversalSearch } from "@/components/modules/common/universal-search";
import { searchProducts } from "@/actions/module/billing";
import { Badge } from "@/components/ui/badge";

const productItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productName: z.string().min(1),
  batchId: z.string().optional(),
  batchNumber: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  mrp: z.number().min(0),
  saleRate: z.number().min(0),
  discount: z.number().min(0),
  taxPercent: z.number().min(0).max(100),
  cgstPercent: z.number().optional(),
  sgstPercent: z.number().optional(),
  availableStock: z.number().optional(),
  expiryDate: z.date().optional(),
});

type ProductItemInput = z.infer<typeof productItemSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductItemInput) => void;
  onClose: () => void;
  initialData?: Partial<ProductItemInput>;
}

interface ProductWithBatch {
  id: string;
  name: string;
  sku: string;
  mrp: number;
  saleRate: number;
  currentStock: number;
  gst?: number;
  cgst?: number;
  sgst?: number;
  hsnCodeValue?: string;
  batches?: Array<{
    id: string;
    batchNumber: string;
    remainingQty: number;
    expiryDate: Date | null;
    mrp: number;
    saleRate: number;
  }>;
}

export function BillingProductForm({ onSubmit, onClose, initialData }: ProductFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBatch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const form = useForm<ProductItemInput>({
    resolver: zodResolver(productItemSchema),
    defaultValues: initialData || {
      productId: "",
      productName: "",
      quantity: 1,
      mrp: 0,
      saleRate: 0,
      discount: 0,
      taxPercent: 0,
      availableStock: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const handleProductSelect = (product: ProductWithBatch) => {
    setSelectedProduct(product);

    if (product.batches && product.batches.length > 0) {
      const sortedBatches = [...product.batches].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.getTime() - b.expiryDate.getTime();
      });

      const firstBatch = sortedBatches[0];
      setSelectedBatch(firstBatch.id);

      form.setValue("productId", product.id);
      form.setValue("productName", product.name);
      form.setValue("batchId", firstBatch.id);
      form.setValue("batchNumber", firstBatch.batchNumber);
      form.setValue("mrp", firstBatch.mrp);
      form.setValue("saleRate", firstBatch.saleRate);
      form.setValue("availableStock", firstBatch.remainingQty);
      form.setValue("expiryDate", firstBatch.expiryDate || undefined);
      form.setValue("taxPercent", product.gst || 0);
    } else {
      form.setValue("productId", product.id);
      form.setValue("productName", product.name);
      form.setValue("mrp", product.mrp);
      form.setValue("saleRate", product.saleRate);
      form.setValue("availableStock", product.currentStock);
      form.setValue("taxPercent", product.gst || 0);
      form.setValue("batchId", undefined);
      form.setValue("batchNumber", undefined);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatch(batchId);
    const batch = selectedProduct?.batches?.find((b) => b.id === batchId);
    if (batch) {
      form.setValue("batchId", batch.id);
      form.setValue("batchNumber", batch.batchNumber);
      form.setValue("mrp", batch.mrp);
      form.setValue("saleRate", batch.saleRate);
      form.setValue("availableStock", batch.remainingQty);
      form.setValue("expiryDate", batch.expiryDate || undefined);
    }
  };

  const quantity       = form.watch("quantity");
  const saleRate       = form.watch("saleRate");
  const discount       = form.watch("discount");
  const taxPercent     = form.watch("taxPercent");
  const availableStock = form.watch("availableStock");

  const cgstPercent  = selectedProduct?.cgst || taxPercent / 2;
  const sgstPercent  = selectedProduct?.sgst || taxPercent / 2;
  const grossAmount  = saleRate * quantity;
  const baseAmount   = taxPercent > 0 ? grossAmount / (1 + taxPercent / 100) : grossAmount;
  const cgstAmount   = (baseAmount * cgstPercent) / 100;
  const sgstAmount   = (baseAmount * sgstPercent) / 100;
  const totalTaxAmount = cgstAmount + sgstAmount;
  const totalAmount  = grossAmount - discount;

  const handleFormSubmit = (data: ProductItemInput) => {
    if (availableStock !== undefined && data.quantity > availableStock) {
      form.setError("quantity", {
        message: `Only ${availableStock} units available in stock`,
      });
      return;
    }
    onSubmit({ ...data, cgstPercent, sgstPercent });
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">

      {/* Product Search */}
      <div>
        <UniversalSearch
          searchFunction={searchProducts}
          onSelect={handleProductSelect}
          placeholder="Search by product name..."
          displayKeys={["name", "currentStock", "sku"]}
          renderResult={(product) => (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  MRP: ${product.mrp} | Sale: ${product.saleRate}
                </p>
              </div>
              <Badge variant={product.currentStock > 0 ? "default" : "destructive"}>
                Stock: {product.currentStock} {product.sku}
              </Badge>
            </div>
          )}
          label="Search Product"
          required
          minChars={2}
        />
        {form.formState.errors.productId && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.productId.message}
          </p>
        )}
      </div>

      {/* Selected Product Info */}
      {selectedProduct && (
        <div className="p-3 bg-muted rounded-md space-y-2">
          <p className="font-medium">{selectedProduct.name}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Available Stock:</span>
              <span className="ml-2 font-medium">
                {availableStock !== undefined ? availableStock : selectedProduct.currentStock}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Unit:</span>
              <span className="ml-2">{selectedProduct.sku || "PCS"}</span>
            </div>
          </div>

          {/* Batch Selection */}
          {selectedProduct.batches && selectedProduct.batches.length > 0 && (
            <div className="space-y-2">
              <Label>Select Batch (FIFO)</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {selectedProduct.batches
                  .sort((a, b) => {
                    if (!a.expiryDate) return 1;
                    if (!b.expiryDate) return -1;
                    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                  })
                  .map((batch) => (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => handleBatchSelect(batch.id)}
                      className={`w-full p-2 text-left text-sm border rounded-md transition-colors ${
                        selectedBatch === batch.id
                          ? "bg-blue-50 border-blue-500"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Batch: {batch.batchNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {batch.remainingQty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">${batch.saleRate}</p>
                          {batch.expiryDate && (
                            <p className="text-xs text-muted-foreground">
                              Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quantity and Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantity *</Label>
          <Input
            type="number" min="1"
            max={availableStock || 9999}
            {...form.register("quantity", { valueAsNumber: true })}
          />
          {form.formState.errors.quantity && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.quantity.message}
            </p>
          )}
          {availableStock !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              Max available: {availableStock}
            </p>
          )}
        </div>

        <div>
          <Label>MRP (Inc. Tax)</Label>
          <Input
            type="number" step="0.01"
            {...form.register("mrp", { valueAsNumber: true })}
            disabled
          />
        </div>

        <div>
          <Label>Sale Rate * (Inc. Tax)</Label>
          <Input
            type="number" step="0.01"
            {...form.register("saleRate", { valueAsNumber: true })}
          />
        </div>

        <div>
          <Label>Discount</Label>
          <Input
            type="number" step="0.01"
            {...form.register("discount", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Tax Breakdown */}
      {selectedProduct && taxPercent > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
          <p className="font-medium text-sm text-amber-900">Tax Breakdown (Inclusive)</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Amount:</span>
              <span className="font-medium">${grossAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs border-t pt-1">
              <span className="text-muted-foreground">Taxable Amount:</span>
              <span>${baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CGST ({cgstPercent}%):</span>
              <span>${cgstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">SGST ({sgstPercent}%):</span>
              <span>${sgstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold border-t pt-1">
              <span>Total Tax ({taxPercent}%):</span>
              <span>${totalTaxAmount.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <span>Discount:</span>
                <span>− ${discount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="p-3 bg-blue-50 rounded-md">
        <div className="flex justify-between items-center">
          <span className="font-medium">Final Amount:</span>
          <span className="text-lg font-bold text-blue-600">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedProduct}>
          {initialData ? "Update" : "Add"} Product
        </Button>
      </div>
    </form>
  );
}