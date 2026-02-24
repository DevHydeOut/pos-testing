import * as z from "zod";


export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  location: z.enum(["STORE", "PHARMACY", "WAREHOUSE"]), // Adjust based on your Location enum
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]), // Adjust based on your MovementType enum
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional().nullable(),
  mrp: z.number().optional(),
  saleRate: z.number().optional(),
  purchaseRate: z.number().optional(),
  remark: z.string().optional(),
});

export const stockBatchSchema = z.object({
  movements: z.array(stockMovementSchema).min(1, "At least one product must be added"),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

