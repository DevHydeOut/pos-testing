// ─── ADD THIS TO YOUR EXISTING src/schemas/stock.ts ───────────────────────────

import * as z from "zod";

// ── existing schemas (already in your file, shown for context) ─────────────────
export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  location: z.enum(["STORE", "PHARMACY", "WAREHOUSE"]),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional().nullable(),
  mrp: z.number().optional(),
  saleRate: z.number().optional(),
  purchaseRate: z.number().optional(),
  remark: z.string().optional(),
});

export const stockBatchSchema = z.object({
  movements: z
    .array(stockMovementSchema)
    .min(1, "At least one product must be added"),
});

// ── NEW: Transfer schema ───────────────────────────────────────────────────────

export const transferItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export const transferStockSchema = z.object({
  destinationSiteId: z.string().min(1, "Destination site is required"),
  remark: z.string().optional(),
  items: z
    .array(transferItemSchema)
    .min(1, "At least one product must be added"),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type TransferItemInput = z.infer<typeof transferItemSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;