// schemas/new-auth.ts
import * as z from "zod";

// ============================================
// SUB-USER LOGIN SCHEMA
// ============================================
export const SubUserLoginSchema = z.object({
  companyCode: z.string().min(1, "Company code is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// ============================================
// CREATE SUB-USER SCHEMA
// ============================================
export const CreateSubUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  email: z.string().email().optional(),
  // ✅ Make pagePermissions completely optional - it will be assigned per-site
  pagePermissions: z.record(z.string(), z.array(z.string())).optional(),
});

// ============================================
// CREATE SITE SCHEMA
// ============================================
export const CreateSiteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
});

// ============================================
// SITE PERMISSION SCHEMA
// ============================================
export const SitePermissionSchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  pagePermissions: z.record(z.string(), z.array(z.string())).optional(),
  allowedUrls: z.array(z.string()).optional(),
  restrictedUrls: z.array(z.string()).optional(),
  canViewAnalytics: z.boolean().optional(),
  canManageInventory: z.boolean().optional(),
  canManageSales: z.boolean().optional(),
  canManagePatients: z.boolean().optional(),
  canManageEmployees: z.boolean().optional(),
});

// ============================================
// UPDATE SUB-USER SCHEMA
// ============================================
export const UpdateSubUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

// ============================================
// BULK ASSIGN SITES SCHEMA
// ============================================
export const BulkAssignSitesSchema = z.object({
  userIds: z.array(z.string()),
  siteIds: z.array(z.string()),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});