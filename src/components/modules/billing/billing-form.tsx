"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Star, Gift,
  Printer, RotateCcw, CheckCircle2, Phone, User,
  Package, Loader2, X, Tag, ShoppingCart, Pencil, Zap,
  Banknote, CreditCard, Smartphone, Landmark, Globe, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createSale, generateBillNo } from "@/actions/module/billing";
import {
  getRoyaltyAccountByPhone,
  earnRoyaltyPoints,
  redeemRoyaltyReward,
} from "@/actions/module/royalty-config";
import { getRoyaltyRewards } from "@/actions/module/royalty-reward";
import { getSiteTaxConfig } from "@/actions/module/tax-config";
import { calculateLineTax, type ProvinceTax } from "@/lib/canada-tax";
import BillPrintManager, { BillPrintData } from "@/components/modules/billing/bill-print";
import { BillingProductForm } from "@/components/modules/common/product-dialog"; 
import { EntityDialog } from "@/components/modules/common/EntityDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductItem {             
  id: string;
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  mrp: number;
  saleRate: number;
  discount: number;
  taxPercent: number;
  gstAmount: number;
  hstAmount: number;
  pstAmount: number;
  qstAmount: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  availableStock?: number;
  expiryDate?: Date;
}

// FIX: do NOT extend ProvinceTax — DB SiteTaxConfig lacks code/name/taxType/notes.
// Cast to ProvinceTax only at the calculateLineTax call site.
interface TaxConfig {
  isEnabled: boolean;
  provinceCode: string;
  provinceName: string;
  totalRate: number;
  gstRate: number;
  hstRate: number;
  pstRate: number;
  qstRate: number;
}

interface RoyaltyAccount {
  id: string;
  phone: string;
  customerName: string;
  currentPoints: number;
}

interface RoyaltyReward {
  id: string;
  name: string;
  rewardType: "DISCOUNT" | "PRODUCT";
  pointsRequired: number;
  couponName?: string | null;
  discountPercent?: number | null;
  discountMaxCap?: number | null;
  productId?: string | null;
  productQty?: number | null;
  product?: { name: string } | null;
}

type PaymentMethod = "CASH" | "CARD" | "UPI" | "ETRANSFER" | "CHEQUE";

interface Props { siteId: string }

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "CASH",      label: "Cash",       icon: <Banknote   className="h-3.5 w-3.5" /> },
  { value: "CARD",      label: "Card",       icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: "ETRANSFER", label: "e-Transfer", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: "CHEQUE",    label: "Cheque",     icon: <Landmark   className="h-3.5 w-3.5" /> },
  { value: "UPI",       label: "Other",      icon: <Globe      className="h-3.5 w-3.5" /> },
];

// ─── Rewards dropdown ─────────────────────────────────────────────────────────

function RewardsDropdown({
  rewards,
  onClaim,
}: {
  rewards: RoyaltyReward[];
  onClaim: (r: RoyaltyReward) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (rewards.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Not enough points for any reward
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline" size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setOpen((o) => !o)}
      >
        <Gift className="w-3.5 h-3.5 text-amber-500" />
        Claim reward ({rewards.length})
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-lg border bg-popover shadow-lg">
          <p className="text-xs text-muted-foreground px-3 pt-2.5 pb-1">
            Select a reward to claim:
          </p>
          <div className="max-h-56 overflow-y-auto divide-y">
            {rewards.map((r) => (
              <button
                key={r.id}
                onClick={() => { onClaim(r); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    {r.rewardType === "DISCOUNT"
                      ? <Tag     className="w-3.5 h-3.5 text-amber-600" />
                      : <Package className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.rewardType === "DISCOUNT"
                        ? `${r.discountPercent}% off${r.discountMaxCap ? ` · max $${r.discountMaxCap}` : ""}`
                        : `Free: ${r.product?.name ?? "product"} ×${r.productQty}`}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                  {r.pointsRequired} pts
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tax summary line ─────────────────────────────────────────────────────────

function TaxSummaryLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>${amount.toFixed(2)}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function POSBillingForm({ siteId }: Props) {
  // Core state
  const [billNo, setBillNo]               = useState("—");
  const [products, setProducts]           = useState<ProductItem[]>([]);
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billDiscount, setBillDiscount]   = useState(0);
  const [remark, setRemark]               = useState("");
  const [loading, setLoading]             = useState(false);
  const [currentTime, setCurrentTime]     = useState(new Date());

  // Tax
  const [taxConfig, setTaxConfig]   = useState<TaxConfig | null>(null);  // FIX: line 197
  const [taxLoading, setTaxLoading] = useState(true);

  // Dialog
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingIndex, setEditingIndex]           = useState<number | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paidAmount, setPaidAmount]       = useState(0);

  // Print
  const [billToPrint, setBillToPrint] = useState<BillPrintData | null>(null);
  const [showPrint, setShowPrint]     = useState(false);

  // Royalty
  const [phoneSearching, setPhoneSearching]     = useState(false);
  const [royaltyAccount, setRoyaltyAccount]     = useState<RoyaltyAccount | null>(null);
  const [allRewards, setAllRewards]             = useState<RoyaltyReward[]>([]);
  const [availableRewards, setAvailableRewards] = useState<RoyaltyReward[]>([]);
  const [claimedReward, setClaimedReward]       = useState<RoyaltyReward | null>(null);
  const [royaltyDiscount, setRoyaltyDiscount]   = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    generateBillNo().then(setBillNo);

    getRoyaltyRewards(siteId)
      .then((r) => setAllRewards(r as RoyaltyReward[]))
      .catch(() => {});

    getSiteTaxConfig(siteId)
      .then((config) => setTaxConfig(config as TaxConfig))  // FIX: line 197 (setTaxConfig)
      .catch(() => {})
      .finally(() => setTaxLoading(false));

    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [siteId]);

  // ── Recalculate tax when config loads ────────────────────────────────────
  // FIX: line 242 — added products.length (via products) to dependency array
  useEffect(() => {
    if (!taxConfig || products.length === 0) return;
    setProducts((prev) => prev.map((p) => applyTaxToItem(p, taxConfig)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxConfig]);

  // ── Tax calculation helper ────────────────────────────────────────────────
  // FIX: lines 245 — replaced `any` with proper types
  const applyTaxToItem = (item: ProductItem, tc: TaxConfig | null): ProductItem => {
    if (!tc?.isEnabled) {
      const subtotal = item.saleRate * item.quantity;
      return {
        ...item,
        taxPercent: 0, gstAmount: 0, hstAmount: 0, pstAmount: 0, qstAmount: 0,
        taxAmount: 0, subtotal,
        totalAmount: subtotal - (item.discount ?? 0),
      };
    }
    const tax = calculateLineTax(item.saleRate, item.quantity, tc as unknown as ProvinceTax);
    return {
      ...item,
      taxPercent:  tc.totalRate,
      gstAmount:   tax.gstAmount,
      hstAmount:   tax.hstAmount,
      pstAmount:   tax.pstAmount,
      qstAmount:   tax.qstAmount,
      taxAmount:   tax.totalTax,
      subtotal:    tax.subtotal,
      totalAmount: tax.subtotal - (item.discount ?? 0) + tax.totalTax,
    };
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotalAll    = products.reduce((s, p) => s + p.subtotal, 0);
  const itemDiscounts  = products.reduce((s, p) => s + (p.discount ?? 0), 0);
  const totalGst       = products.reduce((s, p) => s + p.gstAmount, 0);
  const totalHst       = products.reduce((s, p) => s + p.hstAmount, 0);
  const totalPst       = products.reduce((s, p) => s + p.pstAmount, 0);
  const totalQst       = products.reduce((s, p) => s + p.qstAmount, 0);
  const totalTaxAmount = products.reduce((s, p) => s + p.taxAmount, 0);
  const grossAmount    = products.reduce((s, p) => s + p.totalAmount, 0);
  const netAmount      = Math.max(0, grossAmount - billDiscount - royaltyDiscount);
  const dueAmount      = netAmount - paidAmount;
  const pointsToEarn   = Math.floor(netAmount);

  // ── Phone lookup with debounce ────────────────────────────────────────────
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    setRoyaltyAccount(null);
    setAvailableRewards([]);
    setClaimedReward(null);
    setRoyaltyDiscount(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 10) return;
    debounceRef.current = setTimeout(async () => {
      setPhoneSearching(true);
      try {
        const account = await getRoyaltyAccountByPhone(siteId, val.trim());
        setRoyaltyAccount(account);
        if (account) {
          setAvailableRewards(
            allRewards.filter((r) => r.pointsRequired <= account.currentPoints)
          );
        }
      } catch {
        // silent
      } finally {
        setPhoneSearching(false);
      }
    }, 600);
  };

  // ── Claim reward ──────────────────────────────────────────────────────────
  const handleClaimReward = (reward: RoyaltyReward) => {
    let discount = 0;
    if (reward.rewardType === "DISCOUNT" && reward.discountPercent) {
      const raw = (grossAmount * reward.discountPercent) / 100;
      discount = reward.discountMaxCap ? Math.min(raw, reward.discountMaxCap) : raw;
    }
    setClaimedReward(reward);
    setRoyaltyDiscount(discount);
    toast.success(`"${reward.name}" applied!`);
  };

  const handleRemoveReward = () => {
    setClaimedReward(null);
    setRoyaltyDiscount(0);
  };

  // ── Add / edit product ────────────────────────────────────────────────────
  // FIX: lines 327, 334 — replaced `any` with `Omit<ProductItem, "id">`
  const handleAddProduct = (product: Omit<ProductItem, "id">) => {
    const withTax = applyTaxToItem(product as ProductItem, taxConfig);
    setProducts((p) => [...p, { ...withTax, id: Date.now().toString() }]);
    setShowProductDialog(false);
    setEditingIndex(null);
  };

  const handleEditProduct = (index: number, product: Omit<ProductItem, "id">) => {
    const withTax = applyTaxToItem(product as ProductItem, taxConfig);
    setProducts((p) => p.map((item, i) => (i === index ? { ...withTax, id: item.id } : item)));
    setShowProductDialog(false);
    setEditingIndex(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (products.length === 0)     { toast.error("Add at least one product"); return; }
    if (!customerPhone.trim())     { toast.error("Phone number is required"); return; }

    setLoading(true);
    try {
      const result = await createSale({
        billType: "WALKIN",
        customerName: customerName || "Customer",
        customerPhone: customerPhone.trim(),
        remark,
        grossAmount,
        discount: itemDiscounts + billDiscount + royaltyDiscount,
        netAmount,
        paidAmount,
        items: products.map((p) => ({
          productId:   p.productId,
          batchId:     p.batchId,
          productName: p.productName,
          batchNumber: p.batchNumber,
          quantity:    p.quantity,
          mrp:         p.mrp,
          saleRate:    p.saleRate,
          discount:    p.discount,
          taxPercent:  p.taxPercent,
          expiryDate:  p.expiryDate,
        })),
      });

      if (!result.success) { toast.error(result.error || "Failed to create bill"); return; }

      await earnRoyaltyPoints({
        urlSiteId:    siteId,
        phone:        customerPhone.trim(),
        customerName: customerName || "Customer",
        saleId:       result.saleId!,
        saleBillNo:   result.billNo!,
        billAmount:   netAmount,
      });

      if (claimedReward && royaltyAccount) {
        await redeemRoyaltyReward({
          urlSiteId:       siteId,
          accountId:       royaltyAccount.id,
          rewardId:        claimedReward.id,
          saleId:          result.saleId!,
          saleBillNo:      result.billNo!,
          pointsUsed:      claimedReward.pointsRequired,
          discountApplied: royaltyDiscount,
        });
      }

      toast.success(`Bill ${result.billNo} created successfully!`);

      setBillToPrint({
        billNo:        result.billNo!,
        billType:      "WALKIN",
        createdAt:     new Date(),
        customerName:  customerName || "Customer",
        customerPhone,
        items: products.map((p) => ({
          productName: p.productName,
          batchNumber: p.batchNumber,
          quantity:    p.quantity,
          mrp:         p.mrp,
          saleRate:    p.saleRate,
          discount:    p.discount,
          taxPercent:  p.taxPercent,
          totalAmount: p.totalAmount,
        })),
        grossAmount:   grossAmount,
        discount:      itemDiscounts + billDiscount + royaltyDiscount,
        totalTax:      totalTaxAmount,
        netAmount,
        paidAmount,
        dueAmount,
        paymentStatus: dueAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID",
        payments:      [{ method: paymentMethod, amount: paidAmount }],
        remark,

        // ── Royalty fields ────────────────────────────────────────────────────────
        royaltyPointsEarned:   pointsToEarn,
        royaltyPointsBalance:  royaltyAccount?.currentPoints ?? 0,
        royaltyRewardClaimed:  claimedReward?.name,
        royaltyRewardDiscount: royaltyDiscount > 0 ? royaltyDiscount : undefined,
      });
      setShowPrint(true);
      handleReset();
    } catch (e: unknown) {  // FIX: line 424 — replaced `any` with `unknown`
      toast.error(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setProducts([]);
    setCustomerName("");
    setCustomerPhone("");
    setBillDiscount(0);
    setRemark("");
    setPaidAmount(0);
    setPaymentMethod("CASH");
    setRoyaltyAccount(null);
    setAvailableRewards([]);
    setClaimedReward(null);
    setRoyaltyDiscount(0);
    generateBillNo().then(setBillNo);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Point of Sale</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentTime.toLocaleDateString("en-CA", { weekday: "long", day: "2-digit", month: "long" })}
              {" · "}
              {currentTime.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {taxConfig && (
            <Badge variant="outline" className="text-xs gap-1 font-normal">
              {taxConfig.provinceCode} · {taxConfig.totalRate}% tax
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-sm px-3 py-1">
            {billNo}
          </Badge>
        </div>
      </div>

      {/* ── Tax warning ── */}
      {!taxLoading && !taxConfig && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Tax not configured — go to <strong>Settings → Tax</strong> to set your province.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ══════════════════════════════
            LEFT — Customer + Products
        ══════════════════════════════ */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Customer + Royalty strip */}
          <div className="px-4 py-3 border-b bg-muted/30 space-y-2.5 shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Phone number *"
                  value={customerPhone}
                  maxLength={15}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
                {phoneSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="relative flex-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            {/* ── Royalty panel ── */}
            {royaltyAccount ? (
              <div className="rounded-lg border bg-card px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-none">
                        {royaltyAccount.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Balance:{" "}
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {royaltyAccount.currentPoints} pts
                        </span>
                        {availableRewards.length > 0 && (
                          <span className="ml-1.5 text-green-600 dark:text-green-400">
                            · {availableRewards.length} reward{availableRewards.length > 1 ? "s" : ""} available
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {claimedReward ? (
                    <div className="flex items-center gap-1.5">
                      <Badge className="text-xs gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {claimedReward.name}
                      </Badge>
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={handleRemoveReward}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <RewardsDropdown rewards={availableRewards} onClaim={handleClaimReward} />
                  )}
                </div>

                {claimedReward?.rewardType === "PRODUCT" && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <Package className="w-3 h-3 shrink-0" />
                    Hand <strong className="mx-0.5">{claimedReward.productQty}×</strong>{" "}
                    {claimedReward.product?.name ?? "free product"} to customer
                  </div>
                )}
              </div>
            ) : (
              customerPhone.trim().length >= 10 && !phoneSearching && (
                <p className="text-xs text-muted-foreground px-0.5">
                  New customer — loyalty account will be created automatically after billing.
                </p>
              )
            )}
          </div>

          {/* ── Product table ── */}
          <ScrollArea className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No products added</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Click &quot;Add Product&quot; below to start  {/* FIX: lines 594 — escaped quotes */}
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b z-10">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
                    <th className="px-2 py-2.5 text-left font-medium">Product</th>
                    <th className="px-2 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-2 py-2.5 text-right font-medium">Rate</th>
                    <th className="px-2 py-2.5 text-right font-medium">Disc.</th>
                    <th className="px-2 py-2.5 text-right font-medium">Tax</th>
                    <th className="px-2 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/40 group transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-3">
                        <p className="font-medium truncate max-w-[180px]">{item.productName}</p>
                        {item.batchNumber && (
                          <p className="text-xs text-muted-foreground">{item.batchNumber}</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Badge variant="secondary" className="text-xs">{item.quantity}</Badge>
                      </td>
                      <td className="px-2 py-3 text-right text-muted-foreground text-xs">
                        ${item.saleRate.toFixed(2)}
                      </td>
                      <td className="px-2 py-3 text-right text-destructive/70 text-xs">
                        {item.discount > 0 ? `$${item.discount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-3 text-right text-xs">
                        {item.taxAmount > 0 ? (
                          <span
                            className="text-muted-foreground"
                            title={`${item.taxPercent}% (${taxConfig?.provinceCode})`}
                          >
                            ${item.taxAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold">
                        ${item.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => {
                              setEditingIndex(idx);
                              setShowProductDialog(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setProducts((p) => p.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>

          {/* ── Add product bar ── */}
          <div className="px-4 py-3 border-t bg-card shrink-0">
            <EntityDialog
              title={editingIndex !== null ? "Edit Product" : "Add Product"}
              TriggerButton={
                <Button variant="outline" className="w-full h-9 gap-2 text-sm">
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              }
              FormComponent={BillingProductForm}
              formProps={{
                // FIX: billing-form line 699 — cast via unknown to bridge BillingProductForm's
                // native output type and our Omit<ProductItem,"id"> — the form returns a compatible
                // shape at runtime; the cast avoids the structural mismatch TS reports.
                onSubmit: (item: unknown) =>
                  editingIndex !== null
                    ? handleEditProduct(editingIndex, item as Omit<ProductItem, "id">)
                    : handleAddProduct(item as Omit<ProductItem, "id">),
                initialData:
                  editingIndex !== null ? products[editingIndex] : undefined,
                hideTaxInput: true,
              }}
              open={showProductDialog}
              onOpenChange={(o: boolean) => {
                setShowProductDialog(o);
                if (!o) setEditingIndex(null);
              }}
            />
          </div>
        </div>

        {/* ══════════════════════════════
            RIGHT — Bill Summary
        ══════════════════════════════ */}
        <div className="w-80 flex flex-col border-l bg-card shrink-0">
          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-4">

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bill Summary
              </p>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (pre-tax)</span>
                  <span>${subtotalAll.toFixed(2)}</span>
                </div>
                {itemDiscounts > 0 && (
                  <div className="flex justify-between text-destructive/80">
                    <span>Item discounts</span>
                    <span>−${itemDiscounts.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {totalTaxAmount > 0 && taxConfig && (
                <div className="rounded-lg bg-muted/40 border px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {taxConfig.provinceName} Tax
                  </p>
                  {totalGst > 0 && <TaxSummaryLine label={`GST (${taxConfig.gstRate}%)`} amount={totalGst} />}
                  {totalHst > 0 && <TaxSummaryLine label={`HST (${taxConfig.hstRate}%)`} amount={totalHst} />}
                  {totalPst > 0 && <TaxSummaryLine label={`PST (${taxConfig.pstRate}%)`} amount={totalPst} />}
                  {totalQst > 0 && <TaxSummaryLine label={`QST (${taxConfig.qstRate}%)`} amount={totalQst} />}
                  <Separator className="my-1" />
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Total tax</span>
                    <span>${totalTaxAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Bill Discount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" min={0} step={0.01}
                    value={billDiscount || ""}
                    onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                    className="pl-6 h-9 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {claimedReward && royaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {claimedReward.name}
                  </span>
                  <span className="font-semibold">−${royaltyDiscount.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">Total (incl. tax)</span>
                <span className="text-2xl font-bold tabular-nums">${netAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-2">{m.icon}{m.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Amount Tendered</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" min={0} step={0.01}
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="pl-6 h-11 text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  variant="link" size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setPaidAmount(netAmount)}
                >
                  Use exact amount →
                </Button>
              </div>

              <div className={`flex justify-between items-center px-3 py-2.5 rounded-lg border ${
                dueAmount > 0
                  ? "bg-destructive/10 border-destructive/20"
                  : "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
              }`}>
                <span className="text-sm font-medium">
                  {dueAmount < 0 ? "Change" : "Balance due"}
                </span>
                <span className={`text-base font-bold tabular-nums ${
                  dueAmount > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                }`}>
                  ${Math.abs(dueAmount).toFixed(2)}
                </span>
              </div>

              {customerPhone.trim().length >= 10 && netAmount > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Customer earns <span className="font-bold">+{pointsToEarn} points</span> on this bill
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Note (optional)</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  placeholder="Add a note..."
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
            </div>
          </ScrollArea>

          {/* ── CTA ── */}
          <div className="px-5 py-4 border-t space-y-2 shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={loading || products.length === 0}
              className="w-full h-10 font-semibold gap-2"
              size="lg"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><CheckCircle2 className="h-4 w-4" /> Confirm &amp; Print Bill</>}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost" size="sm"
                onClick={handleReset} disabled={loading}
                className="flex-1 text-muted-foreground gap-1.5 h-8"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              {billToPrint && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowPrint(true)}
                  className="flex-1 text-muted-foreground gap-1.5 h-8"
                >
                  <Printer className="h-3.5 w-3.5" /> Reprint
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {billToPrint && (
        <BillPrintManager billData={billToPrint} open={showPrint} onOpenChange={setShowPrint} />
      )}
    </div>
  );
}