// File: src/components/modules/stock/transfer-form.tsx
"use client";

import { useEffect, useState } from "react";
import { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { getSiblinSites, transferStock } from "@/actions/module/stock";

interface Siblingsite {
  id: string;
  name: string;
  siteId: string;
}

interface TransferItem {
  productId: string;
  quantity: number;
}

interface Props {
  products: Product[];
}

export function StockTransferForm({ products }: Props) {
  const [siblinSites, setSiblinSites] = useState<Siblingsite[]>([]);
  const [destinationSiteId, setDestinationSiteId] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<TransferItem[]>([
    { productId: "", quantity: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);

  // Load sibling sites on mount
  useEffect(() => {
    const fetchSites = async () => {
      setLoadingSites(true);
      const res = await getSiblinSites();
      if ("error" in res) {
        setFormError(res.error as string);
      } else {
        setSiblinSites(res.sites);
      }
      setLoadingSites(false);
    };
    fetchSites();
  }, []);

  // ── Item helpers ─────────────────────────────────────────────────────────────

  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof TransferItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Product already selected in another row (avoid duplicate)
  const selectedProductIds = items.map((i) => i.productId).filter(Boolean);

  const availableProducts = (currentIndex: number) =>
    products.filter(
      (p) =>
        !selectedProductIds.includes(p.id) ||
        items[currentIndex].productId === p.id
    );

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormError(null);
    setFormSuccess(null);

    // Basic client-side validation
    if (!destinationSiteId) {
      setFormError("Please select a destination site.");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError("Please add at least one product with a valid quantity.");
      return;
    }

    const incompleteRow = items.find((i) => !i.productId || i.quantity < 1);
    if (incompleteRow) {
      setFormError("Please fill in all product rows before submitting.");
      return;
    }

    setIsSubmitting(true);

    const res = await transferStock({
      destinationSiteId,
      remark,
      items: validItems,
    });

    setIsSubmitting(false);

    if (res && "error" in res) {
      const err = res.error;
      if (typeof err === "string") {
        setFormError(err);
      } else if (err && typeof err === "object" && "formErrors" in err) {
        const flat = err as { formErrors?: string[] };
        setFormError(flat.formErrors?.[0] ?? "Validation failed.");
      } else {
        setFormError("Transfer failed. Please try again.");
      }
    } else {
      setFormSuccess("Stock transferred successfully!");
      setItems([{ productId: "", quantity: 1 }]);
      setDestinationSiteId("");
      setRemark("");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {formError && <FormError message={formError} />}
      {formSuccess && <FormSuccess message={formSuccess} />}

      {/* ── Destination & Remark ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
        <div>
          <Label>Destination Site *</Label>
          {loadingSites ? (
            <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading sites...
            </div>
          ) : siblinSites.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No other sites found under your account.
            </p>
          ) : (
            <Select
              value={destinationSiteId}
              onValueChange={setDestinationSiteId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination site" />
              </SelectTrigger>
              <SelectContent>
                {siblinSites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <Label>Remark (Optional)</Label>
          <Textarea
            placeholder="Reason for transfer..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="resize-none h-10"
          />
        </div>
      </div>

      {/* ── Product Rows ─────────────────────────────────────────────────────── */}
      <div className="border rounded-md p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Products to Transfer</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addItem}
            disabled={items.length >= products.length}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Product
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">📦</div>
              <p className="text-sm">No products added yet.</p>
              <p className="text-xs">Click &quot;Add Product&quot; to get started.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_140px_40px] gap-3 text-xs text-muted-foreground px-1">
              <span>Product</span>
              <span>Quantity</span>
              <span />
            </div>

            {items.map((item, index) => {
              const product = products.find((p) => p.id === item.productId);

              return (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_140px_40px] gap-3 items-center"
                >
                  {/* Product selector */}
                  <Select
                    value={item.productId}
                    onValueChange={(val) =>
                      updateItem(index, "productId", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts(index).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex justify-between w-full gap-4">
                            <span>{p.name}</span>
                            <span className="text-muted-foreground text-xs">
                              Stock: {p.currentStock}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quantity */}
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={product?.currentStock ?? undefined}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                    />
                    {product && item.quantity > product.currentStock && (
                      <p className="text-xs text-red-500 mt-1">
                        Max: {product.currentStock}
                      </p>
                    )}
                  </div>

                  {/* Remove row */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-red-100"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────────── */}
      {items.some((i) => i.productId) && destinationSiteId && (
        <div className="flex items-center justify-between bg-muted/20 border rounded-md px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {items.filter((i) => i.productId).length} product
            {items.filter((i) => i.productId).length !== 1 ? "s" : ""} •{" "}
            {items.reduce((acc, i) => acc + (i.productId ? i.quantity : 0), 0)}{" "}
            units total
          </span>
          <div className="flex items-center gap-2 font-medium">
            <span>This Site</span>
            <ArrowRight className="w-4 h-4" />
            <span>
              {siblinSites.find((s) => s.id === destinationSiteId)?.name}
            </span>
          </div>
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────────────────────── */}
      <Button
        type="button"
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitting || siblinSites.length === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Transferring...
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4 mr-2" />
            Transfer Stock
          </>
        )}
      </Button>
    </div>
  );
}