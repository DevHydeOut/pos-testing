// File: src/components/modules/stock/product-form.tsx
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stockMovementSchema } from "@/schemas/stock";
import { Product } from "@prisma/client";
import { useEffect } from "react";

type StockMovementInput = z.infer<typeof stockMovementSchema>;

interface MedicineFormProps {
  onSubmit: (data: StockMovementInput) => void;
  onClose: () => void;
  products: Product[];
  initialData?: StockMovementInput;
  mode?: 'add' | 'edit';
}

export function MedicineForm({ 
  onSubmit, 
  onClose, 
  products, 
  initialData,
  mode = 'add' 
}: MedicineFormProps) {
  const form = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: initialData || {
      productId: "",
      quantity: 1,
      location: "STORE",
      type: "IN",
      expiryDate: undefined,
    },
  });

  const handleSubmit = (data: StockMovementInput) => {
    // Convert date string to Date object if needed
    if (data.expiryDate && typeof data.expiryDate === 'string') {
      data.expiryDate = new Date(data.expiryDate);
    }
    onSubmit(data);
    onClose();
  };

  useEffect(() => {
    if (!initialData) {
      form.setValue("type", "IN");
      form.setValue("location", "STORE");
    }
  }, [initialData, form]);

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.setValue(key as keyof StockMovementInput, value);
        }
      });
    }
  }, [initialData, form]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label>Product *</Label>
        <Select
          value={form.watch("productId")}
          onValueChange={(val) => form.setValue("productId", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.productId && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.productId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantity *</Label>
          <Input
            type="number"
            placeholder="Quantity"
            {...form.register("quantity", { valueAsNumber: true })}
          />
          {form.formState.errors.quantity && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.quantity.message}
            </p>
          )}
        </div>

        <div>
          <Label>Batch Number</Label>
          <Input placeholder="Batch No." {...form.register("batchNumber")} />
        </div>
      </div>

      <div>
        <Label>Expiry Date</Label>
        <Input 
          type="date" 
          {...form.register("expiryDate", {
            setValueAs: (value) => value ? new Date(value) : undefined
          })}
          defaultValue={
            initialData?.expiryDate 
              ? new Date(initialData.expiryDate).toISOString().split('T')[0]
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>MRP</Label>
          <Input 
            type="number" 
            step="0.01"
            placeholder="MRP" 
            {...form.register("mrp", { valueAsNumber: true })} 
          />
        </div>

        <div>
          <Label>Sale Rate</Label>
          <Input 
            type="number" 
            step="0.01"
            placeholder="Sale Rate" 
            {...form.register("saleRate", { valueAsNumber: true })} 
          />
        </div>

        <div>
          <Label>Purchase Rate</Label>
          <Input 
            type="number" 
            step="0.01"
            placeholder="Purchase Rate" 
            {...form.register("purchaseRate", { valueAsNumber: true })} 
          />
        </div>
      </div>

      <div>
        <Label>Remark</Label>
        <Input placeholder="Remark (optional)" {...form.register("remark")} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {mode === 'edit' ? 'Update Medicine' : 'Add Medicine'}
        </Button>
      </DialogFooter>
    </form>
  );
}