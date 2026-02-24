import { z } from "zod";

export const rewardType = z.enum(["DISCOUNT", "PRODUCT"]);

const discountSchema = z.object({
  rewardType: z.literal("DISCOUNT"),
  name: z.string().min(1, "Reward name is required"),
  pointsRequired: z
    .number({ error: "Points required" })
    .int("Points must be a whole number")
    .min(1, "Minimum 1 point required"),
  couponName: z.string().min(1, "Coupon name is required"),
  discountPercent: z
    .number({ error: "Discount % required" })
    .min(0.01, "Must be greater than 0")
    .max(100, "Cannot exceed 100%"),
  discountMaxCap: z
    .number({ error: "Must be a number" })
    .min(0, "Cannot be negative")
    .nullable()
    .optional(),
});

const productSchema = z.object({
  rewardType: z.literal("PRODUCT"),
  name: z.string().min(1, "Reward name is required"),
  pointsRequired: z
    .number({ error: "Points required" })
    .int("Points must be a whole number")
    .min(1, "Minimum 1 point required"),
  productId: z.string().min(1, "Please select a product"),
  productName: z.string().min(1, "Product name is required"),
  productQty: z
    .number({ error: "Quantity required" })
    .int("Quantity must be a whole number")
    .min(1, "Minimum quantity is 1"),
});

export const royaltyRewardSchema = z.discriminatedUnion("rewardType", [
  discountSchema,
  productSchema,
]);

export type RoyaltyRewardFormData = z.infer<typeof royaltyRewardSchema>;

export type ActionResponse =
  | { success: true; id: string }
  | { error: { message: string } };