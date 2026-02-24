import { z } from "zod";
import { AppointmentSchema } from "@/schemas/appointment";


// lib/service.ts
export const ALLOWED_SERVICE_CATEGORY_TYPES = ["Disease"];

// /lib/category.ts
export const DESIGNATION_CATEGORY_TYPES = ["designation", "Designation"];


export const PRODUCT_CATEGORY_TYPES = ["Designation", "designation"];


// types/appointment.ts

export type AppointmentFormValues = z.infer<typeof AppointmentSchema>;


export const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];
