// schemas/module.ts
import * as z from "zod";
import { SKUType, Type } from "@prisma/client"; 


//Category
export const categorySchema = z.object({
  type: z.nativeEnum(Type), 
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
});


// Service
export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

// Employee
export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  consultationFee: z.number().min(0, "Consultation fee must be positive"),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      isWorking: z.boolean(),
    })
  ),
});

// HSN
export const hsnSchema = z.object({
    name: z.string().min(1, "Name is required"),
    hsnCode: z.string().min(1, "HSN Code is required"),
    gst: z.coerce.number().min(0, "GST must be 0 or more").max(100, "GST cannot exceed 100"),
  })
  .transform((data) => ({
    ...data,
    cgst: data.gst / 2,
    sgst: data.gst / 2,
  }));

export type HsnFormData = z.infer<typeof hsnSchema>;


//Reference
export const referenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
});


//Porduct
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  shortName: z.string().min(1, "Short name is required"),
  hsnCodeId: z.string().min(1, "HSN Code is required"),
  categoryId: z.string().min(1, "Category is required"),

  sku: z.nativeEnum(SKUType),

  mrp: z.number().min(0, "MRP must be a non-negative number"),
  saleRate: z.number().min(0, "Sale rate must be a non-negative number"),
  purchaseRate: z.number().min(0, "Purchase rate must be a non-negative number"),
});
