"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleItem {                        // FIX: line 14 — replaces `any` in items array
  id?: string;
  productName: string;
  batchNumber?: string | null;
  quantity: number;
  saleRate: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  originalQuantity?: number;
  originalDiscount?: number;
}

interface Sale {                            // FIX: line 17 — replaces `sale: any` prop
  id: string;
  billNo: string;
  remark?: string | null;
  discount?: number;
  paidAmount?: number;
  paymentStatus: string;
  customerName?: string | null;
  customerPhone?: string | null;
  patient?: { name?: string | null; phone?: string | null } | null;
  items: SaleItem[];
}

export interface UpdatedSale {
  id: string;
  items: SaleItem[];
  billDiscount: number;
  remark: string;
  editReason: string;
  grossAmount: number;
  discount: number;
  netAmount: number;
  totalTax: number;
}

interface EditBillModalProps {
  sale: Sale;                               // FIX: was `any`
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedSale: UpdatedSale) => void; // FIX: was `any`
}

export function EditBillModal({ sale, open, onOpenChange, onSave }: EditBillModalProps) {
  const [items, setItems]               = useState<SaleItem[]>([]);  // FIX: line 30 — was `any[]`
  const [billDiscount, setBillDiscount] = useState(0);
  const [remark, setRemark]             = useState("");
  const [editReason, setEditReason]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (sale && open) {
      setItems(sale.items.map((item) => ({   // FIX: line 35 — was `(item: any)`
        ...item,
        originalQuantity: item.quantity,
        originalDiscount: item.discount,
      })));
      const itemDiscountTotal = sale.items.reduce((s, i) => s + i.discount, 0); // FIX: line 43 — was `(s: number, i: any)`
      setBillDiscount(Math.max(0, (sale.discount ?? 0) - itemDiscountTotal));
      setRemark(sale.remark || "");
      setEditReason("");
      setError(null);
    }
  }, [sale, open]);

  const updateItem = (index: number, field: keyof SaleItem, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const gross = updated.saleRate * updated.quantity;
        const base  = updated.taxPercent > 0 ? gross / (1 + updated.taxPercent / 100) : gross;
        updated.taxAmount   = gross - base;
        updated.totalAmount = gross - updated.discount;
        return updated;
      })
    );
  };

  const removeItem = (index: number) => {
    if (items.length === 1) { setError("At least one item is required."); return; }
    setItems((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  // Calculations
  const grossAmount   = items.reduce((s, i) => s + i.saleRate * i.quantity, 0);
  const itemDiscounts = items.reduce((s, i) => s + i.discount, 0);
  const totalTax      = items.reduce((s, i) => s + i.taxAmount, 0);
  const netAmount     = grossAmount - itemDiscounts - billDiscount;

  const handleSave = async () => {
    if (!editReason.trim()) { setError("Please provide a reason for editing."); return; }
    if (items.length === 0)  { setError("At least one item is required."); return; }
    setLoading(true);
    try {
      await onSave({          // FIX: line 76 — was `e: any`; catch block now uses `unknown`
        id: sale.id,
        items,
        billDiscount,
        remark,
        editReason,
        grossAmount,
        discount: itemDiscounts + billDiscount,
        netAmount,
        totalTax,
      });
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update bill");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => !loading && onOpenChange(false)} />

      <div className="relative bg-background rounded-lg border shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Edit className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Edit Bill</p>
              <p className="text-xs text-muted-foreground font-mono">#{sale.billNo}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => !loading && onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {/* Bill info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Customer: </span>
              <span className="font-medium">{sale.patient?.name || sale.customerName || "—"}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div>
              <span className="text-xs text-muted-foreground">Phone: </span>
              <span className="font-medium">{sale.patient?.phone || sale.customerPhone || "—"}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">{sale.paymentStatus}</Badge>
          </div>

          {/* Items table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Items ({items.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/20">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-medium">Product</th>
                    <th className="px-3 py-2.5 text-left font-medium">Batch</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Qty</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                    <th className="px-3 py-2.5 text-right font-medium w-28">Discount</th>
                    <th className="px-3 py-2.5 text-right font-medium">Tax</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{item.productName}</p>
                        {item.originalQuantity !== item.quantity && (
                          <p className="text-xs text-amber-600">Was: {item.originalQuantity}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{item.batchNumber || "—"}</td>
                      <td className="px-3 py-3">
                        <Input
                          type="number" min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20 h-7 text-right text-xs"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">₹{item.saleRate?.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <Input
                          type="number" min={0} step={0.01}
                          value={item.discount}
                          onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                          className="w-24 h-7 text-right text-xs"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground text-xs">₹{item.taxAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{item.totalAmount?.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom grid: summary + remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Remarks + Edit Reason */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Remark</Label>
                <Textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional note..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-destructive">
                  Edit Reason <span className="font-normal">(required)</span>
                </Label>
                <Textarea
                  value={editReason}
                  onChange={(e) => { setEditReason(e.target.value); if (e.target.value.trim()) setError(null); }}
                  placeholder="Why is this bill being edited?"
                  rows={3}
                  className="resize-none text-sm border-destructive/40 focus:border-destructive"
                />
                <p className="text-xs text-muted-foreground">Logged for audit purposes.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Updated Summary</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Gross</span><span>₹{grossAmount.toFixed(2)}</span>
              </div>
              {itemDiscounts > 0 && (
                <div className="flex justify-between text-destructive/80">
                  <span>Item Discounts</span><span>−₹{itemDiscounts.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Bill Discount</span>
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                  <Input
                    type="number" min={0} step={0.01}
                    value={billDiscount || ""}
                    onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                    className="pl-5 h-7 text-xs text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {totalTax > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Tax (incl.)</span><span>₹{totalTax.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Net Total</span>
                <span>₹{netAmount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Current paid: <span className="font-medium text-green-600">₹{sale.paidAmount?.toFixed(2)}</span>
                {" · "}
                New due: <span className={`font-medium ${Math.max(0, netAmount - (sale.paidAmount ?? 0)) > 0 ? "text-destructive" : "text-green-600"}`}>
                  ₹{Math.max(0, netAmount - (sale.paidAmount ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} · Net ₹{netAmount.toFixed(2)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !editReason.trim()} className="gap-2 min-w-[120px]">
              <Save className="h-3.5 w-3.5" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}