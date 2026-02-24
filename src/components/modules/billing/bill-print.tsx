// File: src/components/modules/billing/bill-print.tsx
"use client";

import React, { useRef, useState } from "react";
import { Printer, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================
// TYPES
// ============================================

type PaperSize = "a4" | "a5" | "thermal-80mm" | "thermal-58mm" | "letter";

interface PrintConfig {
  paperSize: PaperSize;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  licenseNumber: string;
  showLogo: boolean;
  showFooter: boolean;
  footerMessage: string;
}

interface BillItem {
  productName: string;
  batchNumber?: string;
  quantity: number;
  mrp?: number;
  saleRate: number;
  discount: number;
  taxPercent?: number;
  totalAmount: number;
}

interface PaymentMethod {
  method: string;
  amount: number;
  transactionId?: string;
}

// ✅ Extended to include royalty info
export interface BillPrintData {
  billNo: string;
  billType: string;
  createdAt: Date | string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  patientUHID?: string;
  items: BillItem[];
  grossAmount: number;
  discount: number;
  totalTax?: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus?: string;
  payments?: PaymentMethod[];
  remark?: string;
  // ── Royalty ──────────────────────────────
  royaltyPointsEarned?: number;       // points customer earned on this bill
  royaltyPointsBalance?: number;      // balance BEFORE this transaction
  royaltyRewardClaimed?: string;      // reward name e.g. "Summer10 Discount"
  royaltyRewardDiscount?: number;     // dollar value of reward discount
}

// ── Currency helper (Canadian $) ─────────────────────────────────────────────
const cad = (amount: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);

// ============================================
// CONFIGURATION PANEL
// ============================================

interface PrintConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PrintConfig;
  onConfigChange: (config: PrintConfig) => void;
}

function PrintConfigPanel({
  open,
  onOpenChange,
  config,
  onConfigChange,
}: PrintConfigPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-lg shadow-xl w-[90vw] max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Print Settings</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <Select
                value={config.paperSize}
                onValueChange={(value: PaperSize) => onConfigChange({ ...config, paperSize: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                  <SelectItem value="a5">A5 (148 x 210 mm)</SelectItem>
                  <SelectItem value="thermal-80mm">Thermal 80mm</SelectItem>
                  <SelectItem value="thermal-58mm">Thermal 58mm</SelectItem>
                  <SelectItem value="letter">Letter (8.5 x 11 inch)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={config.companyName} onChange={(e) => onConfigChange({ ...config, companyName: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={config.address} onChange={(e) => onConfigChange({ ...config, address: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={config.phone} onChange={(e) => onConfigChange({ ...config, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={config.email} onChange={(e) => onConfigChange({ ...config, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={config.gstNumber} onChange={(e) => onConfigChange({ ...config, gstNumber: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>License Number</Label>
              <Input value={config.licenseNumber} onChange={(e) => onConfigChange({ ...config, licenseNumber: e.target.value })} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="showLogo" checked={config.showLogo} onCheckedChange={(c) => onConfigChange({ ...config, showLogo: !!c })} />
              <Label htmlFor="showLogo" className="cursor-pointer">Show Logo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="showFooter" checked={config.showFooter} onCheckedChange={(c) => onConfigChange({ ...config, showFooter: !!c })} />
              <Label htmlFor="showFooter" className="cursor-pointer">Show Footer Message</Label>
            </div>

            <div className="space-y-2">
              <Label>Footer Message</Label>
              <Textarea value={config.footerMessage} onChange={(e) => onConfigChange({ ...config, footerMessage: e.target.value })} disabled={!config.showFooter} rows={2} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BILL PRINT COMPONENT
// ============================================

interface BillPrintProps {
  billData: BillPrintData;
  config: PrintConfig;
}

function BillPrint({ billData, config }: BillPrintProps) {
  const paperSizeClasses: Record<PaperSize, string> = {
    a4: "w-[210mm] min-h-[297mm]",
    a5: "w-[148mm] min-h-[210mm]",
    "thermal-80mm": "w-[80mm] min-h-[200mm]",
    "thermal-58mm": "w-[58mm] min-h-[150mm]",
    letter: "w-[8.5in] min-h-[11in]",
  };

  const isThermal = config.paperSize.includes("thermal");
  const fontSize  = isThermal ? "text-xs" : "text-sm";
  const date      = typeof billData.createdAt === "string"
    ? new Date(billData.createdAt)
    : billData.createdAt;

  const hasRoyalty =
    (billData.royaltyPointsEarned ?? 0) > 0 ||
    !!billData.royaltyRewardClaimed;

  return (
    <div className={`${paperSizeClasses[config.paperSize]} bg-white p-4 md:p-6 mx-auto print:p-4`}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`border-b-2 border-black pb-3 mb-3 ${isThermal ? "text-center" : ""}`}>
        {config.showLogo && (
          <div className={`${isThermal ? "mx-auto mb-2" : "float-right"} w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs`}>
            LOGO
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-bold mb-1">{config.companyName}</h1>
        <p className={`${fontSize} text-gray-700 whitespace-pre-line`}>{config.address}</p>
        <div className={`${fontSize} text-gray-700 mt-1`}>
          <p>Phone: {config.phone} | Email: {config.email}</p>
          {config.gstNumber    && <p>GST No: {config.gstNumber}</p>}
          {config.licenseNumber && <p>License No: {config.licenseNumber}</p>}
        </div>
      </div>

      {/* ── Bill Info ───────────────────────────────────────────────────── */}
      <div className={`${fontSize} mb-3 ${isThermal ? "" : "grid grid-cols-2 gap-2"}`}>
        <div>
          <p className="font-semibold">Bill No: <span className="font-normal">{billData.billNo}</span></p>
          <p className="font-semibold">Bill Type: <span className="font-normal">{billData.billType}</span></p>
          <p className="font-semibold">Date: <span className="font-normal">{date.toLocaleDateString("en-CA")}</span></p>
          <p className="font-semibold">Time: <span className="font-normal">{date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}</span></p>
        </div>
        <div className={isThermal ? "mt-2" : ""}>
          <p className="font-semibold">Customer Details:</p>
          <p>{billData.customerName}</p>
          {billData.customerPhone && <p>Ph: {billData.customerPhone}</p>}
          {billData.patientUHID  && <p>UHID: {billData.patientUHID}</p>}
          {billData.customerAddress && !isThermal && (
            <p className="text-xs text-gray-600">{billData.customerAddress}</p>
          )}
        </div>
      </div>

      {/* ── Items Table ─────────────────────────────────────────────────── */}
      <div className="border-t-2 border-b-2 border-black py-2 mb-3">
        <table className="w-full">
          <thead>
            <tr className={`${fontSize} font-semibold border-b border-gray-400`}>
              <th className="text-left py-1">Item</th>
              <th className="text-right py-1">Qty</th>
              <th className="text-right py-1">Rate</th>
              {!isThermal && <th className="text-right py-1">Disc.</th>}
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {billData.items.map((item, index) => (
              <tr key={index} className={`${fontSize} border-b border-gray-200`}>
                <td className="py-1.5">
                  <div className="font-medium">{item.productName}</div>
                  {item.batchNumber && (
                    <div className="text-xs text-gray-500">Batch: {item.batchNumber}</div>
                  )}
                </td>
                <td className="text-right py-1.5">{item.quantity}</td>
                <td className="text-right py-1.5">{cad(item.saleRate)}</td>
                {!isThermal && (
                  <td className="text-right py-1.5 text-red-600">
                    {item.discount > 0 ? `− ${cad(item.discount)}` : "—"}
                  </td>
                )}
                <td className="text-right py-1.5 font-semibold">{cad(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div className={`${fontSize} space-y-1 mb-3`}>
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span>{cad(billData.grossAmount)}</span>
        </div>

        {billData.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>− {cad(billData.discount)}</span>
          </div>
        )}

        {/* ── Royalty reward discount ── */}
        {billData.royaltyRewardClaimed && (billData.royaltyRewardDiscount ?? 0) > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>Loyalty Reward ({billData.royaltyRewardClaimed}):</span>
            <span>− {cad(billData.royaltyRewardDiscount!)}</span>
          </div>
        )}

        {billData.totalTax !== undefined && billData.totalTax > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Tax (incl.):</span>
            <span>{cad(billData.totalTax)}</span>
          </div>
        )}

        {/* Net total */}
        <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2 mt-1">
          <span>Total:</span>
          <span>{cad(billData.netAmount)}</span>
        </div>

        <div className="flex justify-between text-green-700">
          <span>Paid:</span>
          <span>{cad(billData.paidAmount)}</span>
        </div>

        {billData.dueAmount !== 0 && (
          <div className={`flex justify-between font-semibold ${billData.dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
            <span>{billData.dueAmount > 0 ? "Balance Due:" : "Change:"}</span>
            <span>{cad(Math.abs(billData.dueAmount))}</span>
          </div>
        )}
      </div>

      {/* ── Payment Methods ─────────────────────────────────────────────── */}
      {billData.payments && billData.payments.length > 0 && (
        <div className={`${fontSize} mb-3 p-2 bg-gray-50 border rounded`}>
          <p className="font-semibold mb-1">Payment Details:</p>
          {billData.payments.map((payment, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span>{payment.method}:</span>
              <span>
                {cad(payment.amount)}
                {payment.transactionId && ` (${payment.transactionId})`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Payment Status ──────────────────────────────────────────────── */}
      {billData.paymentStatus && (
        <div className={`${fontSize} mb-3 p-2 bg-gray-100 rounded`}>
          <p className="font-semibold">
            Payment Status:{" "}
            <span className={billData.paymentStatus === "PAID" ? "text-green-600" : "text-orange-600"}>
              {billData.paymentStatus}
            </span>
          </p>
        </div>
      )}

      {/* ── Royalty / Loyalty Section ───────────────────────────────────── */}
      {hasRoyalty && (
        <div className={`${fontSize} mb-3 border-t-2 border-dashed border-gray-400 pt-3`}>
          <p className="font-bold mb-2 flex items-center gap-1">
            ★ Loyalty Points
          </p>

          <div className="space-y-1">
            {/* Points earned on this bill */}
            {(billData.royaltyPointsEarned ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Points earned this bill:</span>
                <span className="font-semibold text-green-700">
                  + {billData.royaltyPointsEarned} pts
                </span>
              </div>
            )}

            {/* Reward claimed */}
            {billData.royaltyRewardClaimed && (
              <div className="flex justify-between">
                <span className="text-gray-600">Reward redeemed:</span>
                <span className="font-semibold text-amber-700">
                  {billData.royaltyRewardClaimed}
                  {(billData.royaltyRewardDiscount ?? 0) > 0 &&
                    ` (${cad(billData.royaltyRewardDiscount!)} off)`}
                </span>
              </div>
            )}

            {/* Updated balance */}
            {billData.royaltyPointsBalance !== undefined && (
              <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 mt-1">
                <span className="text-gray-600">Updated points balance:</span>
                <span className="font-bold">
                  {(billData.royaltyPointsBalance ?? 0) +
                    (billData.royaltyPointsEarned ?? 0)} pts
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Remarks ─────────────────────────────────────────────────────── */}
      {billData.remark && (
        <div className={`${fontSize} mb-3`}>
          <p className="font-semibold">Note:</p>
          <p className="text-gray-700">{billData.remark}</p>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {config.showFooter && (
        <div className={`${fontSize} text-center border-t pt-3 mt-4 text-gray-600 italic`}>
          {config.footerMessage}
        </div>
      )}

      {/* ── Signatures ──────────────────────────────────────────────────── */}
      <div className={`${fontSize} mt-6 pt-4 ${isThermal ? "text-center" : "flex justify-between"}`}>
        <div className={isThermal ? "mb-4" : ""}>
          <p className="border-t border-gray-400 inline-block px-4">Customer Signature</p>
        </div>
        <div>
          <p className="border-t border-gray-400 inline-block px-4">Authorized Signature</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT - BILL PRINT MANAGER
// ============================================

interface BillPrintManagerProps {
  billData: BillPrintData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BillPrintManager({ billData, open, onOpenChange }: BillPrintManagerProps) {
  const printRef   = useRef<HTMLDivElement>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<PrintConfig>({
    paperSize:      "a4",
    companyName:    "Your Store",
    address:        "123 Main Street, City - 400001\nState, Country",
    phone:          "+91-9876543210",
    email:          "info@store.com",
    gstNumber:      "27XXXXX1234X1Z5",
    licenseNumber:  "DL-XXXXX-XXXXX",
    showLogo:       true,
    showFooter:     true,
    footerMessage:  "Thank you for your visit!",
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;

    const pageSize =
      config.paperSize === "a4"           ? "A4"       :
      config.paperSize === "a5"           ? "A5"       :
      config.paperSize === "thermal-80mm" ? "80mm auto":
      config.paperSize === "thermal-58mm" ? "58mm auto":
      "letter";

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${billData.billNo}</title>
          <style>
            @page { margin: 0; size: ${pageSize}; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={() => onOpenChange(false)} />

      <div className="relative bg-white rounded-lg shadow-xl w-[96vw] max-w-[1400px] h-[96vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Bill Preview — {billData.billNo}</h2>
            <div className="flex gap-3 items-center">
              <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-gray-100 p-6 overflow-auto">
          <div ref={printRef}>
            <BillPrint billData={billData} config={config} />
          </div>
        </div>
      </div>

      <PrintConfigPanel
        open={showConfig}
        onOpenChange={setShowConfig}
        config={config}
        onConfigChange={setConfig}
      />
    </div>
  );
}