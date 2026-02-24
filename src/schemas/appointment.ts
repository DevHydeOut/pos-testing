import * as z from "zod";
import { AppointmentType, Gender, InitialType } from "@prisma/client";

// Fixed schema with proper date validation
export const AppointmentSchema = z.object({
  // Auto-generated fields (will be handled in backend)
  uhid: z.string().optional(),
  billNo: z.string().optional(),
  patientId: z.string().optional(), // For existing patients
  
  // Always required appointment fields
  appointmentType: z.enum([AppointmentType.CONSULTATION, AppointmentType.FOLLOW_UP, AppointmentType.OPD]),
  consultantId: z.string().min(1, "Consultant is required"),
  consultationFee: z.number().min(0, "Fee must be non-negative"),
  // ✅ FIXED: Changed from .optional().nullable() to just .optional()
  date: z.date({ error: "Please select a valid date" }).optional(),
  time: z.string().min(1, "Appointment time is required"),
  
  // Patient fields (validation handled in backend)
  initials: z.enum([InitialType.MR, InitialType.MRS]).optional(),
  name: z.string().optional(),
  guardianInitials: z.enum([InitialType.MR, InitialType.MRS]).optional(),
  guardianName: z.string().optional(),
  gender: z.enum([Gender.Male, Gender.Female, Gender.Others]).optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  
  // Location fields
  country: z.string().optional(),
  state: z.string().optional(), 
  city: z.string().optional(),
  zipcode: z.string().optional(),
  address: z.string().optional(),
  
  // Visit-specific fields (can be undefined for optional)
  age: z.number().min(0, "Age must be non-negative").optional(),
  weight: z.number().min(0, "Weight must be non-negative").optional(),
  
  // Optional appointment fields
  referenceId: z.string().optional(),
  serviceId: z.string().optional(),
  remark: z.string().optional(),
  
  // Financial fields
  grossAmount: z.number().min(0),
  discount: z.number().min(0),
  netAmount: z.number().min(0),
  
  // Payment fields - ALL OPTIONAL (set at payment time)
  paidAmount: z.number().min(0).optional(),
  dueAmount: z.number().min(0).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "NETBANKING", "ONLINE"]).optional(),
  transactionId: z.string().optional(),
});