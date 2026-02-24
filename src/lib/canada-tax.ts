

export type TaxType = "HST" | "GST_PST" | "GST_QST" | "GST_ONLY";

export interface ProvinceTax {
  code: string;         // Province/Territory abbreviation
  name: string;         // Full name
  taxType: TaxType;
  gstRate: number;      // 5 if GST applies separately, 0 if folded into HST
  hstRate: number;      // HST rate (replaces GST+PST), 0 if not HST province
  pstRate: number;      // PST rate, 0 if not applicable
  qstRate: number;      // QST rate (Quebec only), 0 otherwise
  totalRate: number;    // Pre-computed sum for convenience
  notes: string;
}

export const CANADIAN_PROVINCES: ProvinceTax[] = [
  {
    code: "AB", name: "Alberta",
    taxType: "GST_ONLY",
    gstRate: 5, hstRate: 0, pstRate: 0, qstRate: 0, totalRate: 5,
    notes: "No provincial sales tax. GST only.",
  },
  {
    code: "BC", name: "British Columbia",
    taxType: "GST_PST",
    gstRate: 5, hstRate: 0, pstRate: 7, qstRate: 0, totalRate: 12,
    notes: "GST 5% + PST 7% = 12% combined.",
  },
  {
    code: "MB", name: "Manitoba",
    taxType: "GST_PST",
    gstRate: 5, hstRate: 0, pstRate: 7, qstRate: 0, totalRate: 12,
    notes: "GST 5% + PST (RST) 7% = 12% combined.",
  },
  {
    code: "NB", name: "New Brunswick",
    taxType: "HST",
    gstRate: 0, hstRate: 15, pstRate: 0, qstRate: 0, totalRate: 15,
    notes: "HST 15% (replaces GST + PST).",
  },
  {
    code: "NL", name: "Newfoundland and Labrador",
    taxType: "HST",
    gstRate: 0, hstRate: 15, pstRate: 0, qstRate: 0, totalRate: 15,
    notes: "HST 15% (replaces GST + PST).",
  },
  {
    code: "NS", name: "Nova Scotia",
    taxType: "HST",
    gstRate: 0, hstRate: 15, pstRate: 0, qstRate: 0, totalRate: 15,
    notes: "HST 15% (replaces GST + PST).",
  },
  {
    code: "NT", name: "Northwest Territories",
    taxType: "GST_ONLY",
    gstRate: 5, hstRate: 0, pstRate: 0, qstRate: 0, totalRate: 5,
    notes: "No territorial sales tax. GST only.",
  },
  {
    code: "NU", name: "Nunavut",
    taxType: "GST_ONLY",
    gstRate: 5, hstRate: 0, pstRate: 0, qstRate: 0, totalRate: 5,
    notes: "No territorial sales tax. GST only.",
  },
  {
    code: "ON", name: "Ontario",
    taxType: "HST",
    gstRate: 0, hstRate: 13, pstRate: 0, qstRate: 0, totalRate: 13,
    notes: "HST 13% (replaces GST 5% + PST 8%).",
  },
  {
    code: "PE", name: "Prince Edward Island",
    taxType: "HST",
    gstRate: 0, hstRate: 15, pstRate: 0, qstRate: 0, totalRate: 15,
    notes: "HST 15% (replaces GST + PST).",
  },
  {
    code: "QC", name: "Quebec",
    taxType: "GST_QST",
    gstRate: 5, hstRate: 0, pstRate: 0, qstRate: 9.975, totalRate: 14.975,
    notes: "GST 5% + QST 9.975% = 14.975% combined.",
  },
  {
    code: "SK", name: "Saskatchewan",
    taxType: "GST_PST",
    gstRate: 5, hstRate: 0, pstRate: 6, qstRate: 0, totalRate: 11,
    notes: "GST 5% + PST 6% = 11% combined.",
  },
  {
    code: "YT", name: "Yukon",
    taxType: "GST_ONLY",
    gstRate: 5, hstRate: 0, pstRate: 0, qstRate: 0, totalRate: 5,
    notes: "No territorial sales tax. GST only.",
  },
];

/** Look up a province by its 2-letter code. Returns undefined if not found. */
export function getProvinceTax(code: string): ProvinceTax | undefined {
  return CANADIAN_PROVINCES.find((p) => p.code === code.toUpperCase());
}

/**
 * Calculate the tax breakdown for a single line item.
 * Returns individual tax amounts and total tax — all EXCLUSIVE of base price.
 */
export function calculateLineTax(
  saleRate: number,
  quantity: number,
  province: ProvinceTax
): {
  subtotal: number;
  gstAmount: number;
  hstAmount: number;
  pstAmount: number;
  qstAmount: number;
  totalTax: number;
  grandTotal: number;
} {
  const subtotal   = saleRate * quantity;
  const gstAmount  = +(subtotal * province.gstRate  / 100).toFixed(2);
  const hstAmount  = +(subtotal * province.hstRate  / 100).toFixed(2);
  const pstAmount  = +(subtotal * province.pstRate  / 100).toFixed(2);
  const qstAmount  = +(subtotal * province.qstRate  / 100).toFixed(2);
  const totalTax   = +(gstAmount + hstAmount + pstAmount + qstAmount).toFixed(2);
  const grandTotal = +(subtotal + totalTax).toFixed(2);
  return { subtotal, gstAmount, hstAmount, pstAmount, qstAmount, totalTax, grandTotal };
}

/**
 * Build the tax label lines for a bill/receipt.
 * Returns only the tax types that are actually non-zero for this province.
 */
export function getTaxLines(
  province: ProvinceTax,
  totals: { gstAmount: number; hstAmount: number; pstAmount: number; qstAmount: number }
): { label: string; amount: number }[] {
  const lines: { label: string; amount: number }[] = [];
  if (totals.gstAmount > 0) lines.push({ label: `GST (${province.gstRate}%)`,   amount: totals.gstAmount });
  if (totals.hstAmount > 0) lines.push({ label: `HST (${province.hstRate}%)`,   amount: totals.hstAmount });
  if (totals.pstAmount > 0) lines.push({ label: `PST (${province.pstRate}%)`,   amount: totals.pstAmount });
  if (totals.qstAmount > 0) lines.push({ label: `QST (${province.qstRate}%)`,   amount: totals.qstAmount });
  return lines;
}