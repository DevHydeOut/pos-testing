// File: src/components/modules/stock/stock-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z} from "zod";

import {
  stockBatchSchema,
  stockMovementSchema,
} from "@/schemas/stock";
import { createStockBatch } from "@/actions/module/stock";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Location, MovementType, Product } from "@prisma/client";
import { EntityDialog } from "../common/EntityDialog";
import { EntityEditDialog } from "../common/EntityEditDialog";
import { DeleteAlertDialog } from "../common/DeleteAlertDialog";
import { Plus, Edit, Trash2 } from "lucide-react";

import { MedicineForm } from "./product-form";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";

type StockMovementInput = z.infer<typeof stockMovementSchema>;

interface Props {
  products: Product[];
}

export function StockAddForm({ products }: Props) {
  const [medicines, setMedicines] = useState<StockMovementInput[]>([]);
  const [type, setType] = useState<MovementType | undefined>();
  const [location, setLocation] = useState<Location | undefined>();
  const [remark, setRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(stockBatchSchema),
    defaultValues: {
      movements: [],
    },
  });

  const onAddMedicine = (movement: StockMovementInput) => {
    setMedicines((prev) => [...prev, movement]);
  };

  const onEditMedicine = (index: number, updatedMovement: StockMovementInput) => {
    setMedicines((prev) =>
      prev.map((med, i) => (i === index ? updatedMovement : med))
    );
  };

  const onDeleteMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (!type || !location) {
      setFormError("Please select movement type and location.");
      return;
    }

    if (medicines.length === 0) {
      setFormError("Please add at least one medicine.");
      return;
    }

    const finalData = {
      movements: medicines.map((m) => ({
        ...m,
        type,
        location,
        remark,
      })),
    };

    const res = await createStockBatch(finalData);

    if ("error" in res) {
      const error = res.error;

      let errorMessage = "Failed to save stock entry.";

      // Handle Zod errors safely
      if (error && typeof error === "object" && "formErrors" in error) {
        // error is a Zod flattened error object
        const flattenedError = error as { formErrors?: string[] };
        errorMessage = flattenedError.formErrors?.[0] || "Validation failed.";
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setFormError(errorMessage);
    } else {
      setFormSuccess("Stock added successfully.");
      setMedicines([]);
      setRemark("");
      form.reset();
    }
  };

  const totalTransferAmount = medicines.reduce(
    (acc, med) => acc + (med.purchaseRate ?? 0) * med.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {/* ✅ Form Messages */}
      {formError && <FormError message={formError} />}
      {formSuccess && <FormSuccess message={formSuccess} />}

      {/* 🧾 General Info Section */}
      <div className="grid sm:grid-cols-3 gap-4 border p-4 rounded-md bg-muted/20">
        <div>
          <Label>Movement Type</Label>
          <Select onValueChange={(val) => setType(val as MovementType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MovementType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Location</Label>
          <Select onValueChange={(val) => setLocation(val as Location)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Location).map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Remark (Optional)</Label>
          <Textarea
            placeholder="Enter remarks..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
      </div>

      {/* 💊 Medicine List Section */}
      <div className="border rounded-md p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Medicine List</h2>
          <EntityDialog
            title="Add Medicine"
            TriggerButton={<Button><Plus className="w-4 h-4 mr-2" />Add Medicine</Button>}
            formProps={{
              products,
              onSubmit: onAddMedicine,
              onClose: () => {},
            }}
            FormComponent={MedicineForm}
          />
        </div>

        {medicines.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Batch No.</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">MRP</th>
                  <th className="text-left p-2">Sale Rate</th>
                  <th className="text-left p-2">Purchase Rate</th>
                  <th className="text-left p-2">Transfer Amount</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">
                      {products.find((p) => p.id === med.productId)?.name ??
                        "Unknown"}
                    </td>
                    <td className="p-2">{med.batchNumber || "-"}</td>
                    <td className="p-2">{med.quantity}</td>
                    <td className="p-2">{med.mrp ?? "-"}</td>
                    <td className="p-2">{med.saleRate ?? "-"}</td>
                    <td className="p-2">{med.purchaseRate ?? "-"}</td>
                    <td className="p-2">
                      ₹{((med.purchaseRate ?? 0) * med.quantity).toFixed(2)}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <EntityEditDialog
                          title="Edit Medicine"
                          TriggerButton={
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                          }
                          initialData={med}
                          FormComponent={({ onClose, initialData }) => (
                            <MedicineForm
                              products={products}
                              initialData={initialData}
                              onSubmit={(updatedData) => {
                                onEditMedicine(i, updatedData);
                                onClose();
                              }}
                              onClose={onClose}
                            />
                          )}
                        />
                        
                        <DeleteAlertDialog
                          title="Delete Medicine"
                          description={
                            // FIX: line 276 — escaped unescaped quotes using JSX expression
                            `Are you sure you want to remove "${
                              products.find((p) => p.id === med.productId)?.name ?? "Unknown"
                            }" from the list? This action cannot be undone.`
                          }
                          onConfirm={() => onDeleteMedicine(i)}
                          TriggerElement={
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">📦</div>
              <p className="text-sm">No medicines added yet.</p>
              <p className="text-xs">Click &quot;Add Medicine&quot; to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* 💰 Total Amount */}
      {medicines.length > 0 && (
        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-md">
          <div className="text-sm text-muted-foreground">
            {medicines.length} medicine{medicines.length !== 1 ? 's' : ''} added
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-sm">
              Total Transfer Amount
            </div>
            <div className="text-lg font-bold">
              ₹{totalTransferAmount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Submit Button */}
      <Button 
        type="button" 
        className="w-full" 
        onClick={handleSubmit}
        disabled={medicines.length === 0}
      >
        Submit Stock Entry
      </Button>
    </div>
  );
}