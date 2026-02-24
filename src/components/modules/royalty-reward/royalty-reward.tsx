"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Package, Tag, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import {
  royaltyRewardSchema,
  type RoyaltyRewardFormData,
} from "@/schemas/royalty-reward";
import { createRoyaltyReward, updateRoyaltyReward } from "@/actions/module/royalty-reward";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductSearchResult {
  id: string;
  name: string;
  shortName: string;
  currentStock: number;
}

// What the table passes in for editing
export interface RoyaltyRewardInitialData {
  id: string;
  name: string;
  rewardType: "DISCOUNT" | "PRODUCT";
  pointsRequired: number;
  // discount fields
  couponName?: string | null;
  discountPercent?: number | null;
  discountMaxCap?: number | null;
  // product fields
  productId?: string | null;
  productName?: string | null;
  productQty?: number | null;
}

interface Props {
  siteId: string;
  createdBy: string;
  onClose: () => void;
  onSearchProducts: (query: string) => Promise<ProductSearchResult[]>;
  initialData?: RoyaltyRewardInitialData; // optional — if present = edit mode
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function RewardTypeButton({
  active,
  onClick,
  icon,
  label,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 text-center
        transition-all duration-150
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/60"}
        ${active ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground"}
      `}
    >
      <span className={`rounded-full p-2 ${active ? "bg-primary/10" : "bg-muted"}`}>
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs">{description}</span>
    </button>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function RoyaltyRewardForm({
  siteId,
  createdBy,
  onClose,
  onSearchProducts,
  initialData,
}: Props) {
  const isEditMode = !!initialData;

  // ── Reward type state — locked in edit mode ──
  const [rewardType, setRewardType] = useState<"DISCOUNT" | "PRODUCT">(
    initialData?.rewardType ?? "DISCOUNT"
  );

  // ── Product search state ──
  const [searchQuery, setSearchQuery] = useState(initialData?.productName ?? "");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(
    // Pre-populate selected product if editing a PRODUCT reward
    initialData?.rewardType === "PRODUCT" && initialData.productId && initialData.productName
      ? { id: initialData.productId, name: initialData.productName, shortName: "", currentStock: 0 }
      : null
  );
  const [showResults, setShowResults] = useState(false);

  // ── Form setup with initialData pre-filled ──
  const form = useForm<RoyaltyRewardFormData>({
    resolver: zodResolver(royaltyRewardSchema),
    defaultValues:
      initialData?.rewardType === "PRODUCT"
        ? ({
            rewardType: "PRODUCT",
            name: initialData.name,
            pointsRequired: initialData.pointsRequired,
            productId: initialData.productId ?? "",
            productName: initialData.productName ?? "",
            productQty: initialData.productQty ?? 1,
          } as unknown as RoyaltyRewardFormData)
        : ({
            rewardType: "DISCOUNT",
            name: initialData?.name ?? "",
            pointsRequired: initialData?.pointsRequired ?? 0,
            couponName: initialData?.couponName ?? "",
            discountPercent: initialData?.discountPercent ?? 0,
            discountMaxCap: initialData?.discountMaxCap ?? null,
          } as unknown as RoyaltyRewardFormData),
  });

  // ── Switch type (only allowed when creating) ──
  const handleTypeSwitch = (type: "DISCOUNT" | "PRODUCT") => {
    if (isEditMode || type === rewardType) return;
    setRewardType(type);
    setSelectedProduct(null);
    setSearchQuery("");
    setSearchResults([]);

    form.reset(
      type === "DISCOUNT"
        ? ({
            rewardType: "DISCOUNT",
            name: "",
            pointsRequired: 0,
            couponName: "",
            discountPercent: 0,
            discountMaxCap: null,
          } as unknown as RoyaltyRewardFormData)
        : ({
            rewardType: "PRODUCT",
            name: "",
            pointsRequired: 0,
            productId: "",
            productName: "",
            productQty: 1,
          } as unknown as RoyaltyRewardFormData)
    );
  };

  // ── Product search ──
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await onSearchProducts(query);
        setSearchResults(results);
        setShowResults(true);
      } catch {
        toast.error("Failed to search products");
      } finally {
        setIsSearching(false);
      }
    },
    [onSearchProducts]
  );

  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setShowResults(false);
    form.setValue("productId", product.id, { shouldValidate: true });
    form.setValue("productName", product.name, { shouldValidate: true });
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    setSearchResults([]);
    form.setValue("productId", "");
    form.setValue("productName", "");
  };

  // ── Submit ──
  const onSubmit = async (data: RoyaltyRewardFormData) => {
    const res = isEditMode
      ? await updateRoyaltyReward(initialData.id, data)
      : await createRoyaltyReward(siteId, createdBy, data);

    if ("error" in res) {
      toast.error(res.error.message);
      return;
    }

    toast.success(isEditMode ? "Reward updated successfully" : "Reward created successfully");
    form.reset();
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Reward Type Toggle (disabled in edit mode) ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Reward Type
            {isEditMode && (
              <span className="ml-2 text-xs text-muted-foreground">(cannot be changed)</span>
            )}
          </p>
          <div className="flex gap-3">
            <RewardTypeButton
              active={rewardType === "DISCOUNT"}
              onClick={() => handleTypeSwitch("DISCOUNT")}
              icon={<Tag className="h-4 w-4" />}
              label="Discount"
              description="Give % off on their next bill"
              disabled={isEditMode}
            />
            <RewardTypeButton
              active={rewardType === "PRODUCT"}
              onClick={() => handleTypeSwitch("PRODUCT")}
              icon={<Package className="h-4 w-4" />}
              label="Free Product"
              description="Give a product for free"
              disabled={isEditMode}
            />
          </div>
        </div>

        {/* ── Common: Reward Name ── */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reward Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Silver Member Discount" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Common: Points Required ── */}
        <FormField
          control={form.control}
          name="pointsRequired"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points Required to Avail</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 500"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Customer needs this many points to claim this reward.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ══ DISCOUNT FIELDS ══ */}
        {rewardType === "DISCOUNT" && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Discount Details
            </p>

            <FormField
              control={form.control}
              name="couponName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. SUMMER10"
                      className="uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be shown on the bill when redeemed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0.01}
                          max={100}
                          step={0.01}
                          placeholder="e.g. 10"
                          className="pr-8"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountMaxCap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Cap (optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="e.g. 5.00"
                          className="pr-8"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            field.onChange(isNaN(val) ? null : val);
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>Leave empty for no cap.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* ══ PRODUCT FIELDS ══ */}
        {rewardType === "PRODUCT" && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product Details
            </p>

            <input type="hidden" {...form.register("productId")} />
            <input type="hidden" {...form.register("productName")} />

            <FormItem>
              <FormLabel>Search Product</FormLabel>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Type product name..."
                    className="pl-9 pr-9"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    disabled={!!selectedProduct}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={handleClearProduct}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showResults && searchResults.length > 0 && !selectedProduct && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    <ul className="max-h-48 overflow-auto py-1">
                      {searchResults.map((product) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => handleSelectProduct(product)}
                          >
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Stock: {product.currentStock}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-4 text-center text-sm text-muted-foreground shadow-md">
                    No products found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>

              {(form.formState.errors as Record<string, { message?: string }>).productId && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {(form.formState.errors as Record<string, { message?: string }>).productId?.message}
                </p>
              )}
            </FormItem>

            {selectedProduct && (
              <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Current stock: {selectedProduct.currentStock} units
                  </p>
                </div>
                <Package className="h-4 w-4 text-primary" />
              </div>
            )}

            <FormField
              control={form.control}
              name="productQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Give</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 1"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    How many units of this product the customer gets.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              "Update Reward"
            ) : (
              "Create Reward"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}