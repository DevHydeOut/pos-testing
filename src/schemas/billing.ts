import * as z from "zod";

export const SaleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  batchId: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  batchNumber: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  mrp: z.number().min(0, "MRP must be positive"),
  saleRate: z.number().min(0, "Sale rate must be positive"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  taxPercent: z.number().min(0).max(100).default(0),
  expiryDate: z.date().optional(),
});

export const SaleSchema = z.object({
  billType: z.enum(["CONSULTATION", "WALKIN", "RETURN", "COURIER"]),
  
  // Patient info - required for CONSULTATION, optional for WALKIN
  patientId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  
  // Consultation info
  appointmentId: z.string().optional(),
  consultantId: z.string().optional(),
  
  // Bill details
  remark: z.string().optional(),
  grossAmount: z.number().min(0, "Gross amount must be positive"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  netAmount: z.number().min(0, "Net amount must be positive"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative").default(0),
  
  // Return info
  returnForBillNo: z.string().optional(),
  returnReason: z.string().optional(),
  
  // Line items
  items: z.array(SaleItemSchema).min(1, "At least one item is required"),
}).refine(
  (data) => {
    // If CONSULTATION, patientId and appointmentId are required
    if (data.billType === "CONSULTATION") {
      return data.patientId && data.appointmentId;
    }
    return true;
  },
  {
    message: "Patient and appointment required for consultation",
    path: ["patientId"],
  }
).refine(
  (data) => {
    // If WALKIN, customer details should be provided
    if (data.billType === "WALKIN") {
      return data.customerName && data.customerPhone;
    }
    return true;
  },
  {
    message: "Customer name and phone required for walk-in",
    path: ["customerName"],
  }
).refine(
  (data) => {
    // If RETURN, original bill number and reason required
    if (data.billType === "RETURN") {
      return data.returnForBillNo && data.returnReason;
    }
    return true;
  },
  {
    message: "Original bill number and reason required for returns",
    path: ["returnForBillNo"],
  }
);

export type SaleFormData = z.infer<typeof SaleSchema>;