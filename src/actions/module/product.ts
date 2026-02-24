"use server";

import { db } from "@/lib/db";
import { productSchema } from "@/schemas/module";
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";
import { createAuditLog, generateChangeSummary } from "@/lib/audit-logger";

type SiteContextCache = {
  siteId: string;
  userId: string;
  username: string;
  role: string;
};

async function getCachedSiteContext(): Promise<SiteContextCache> {
  const userData = await getSiteContext();
  return {
    siteId: userData.siteId,
    userId: userData.id,
    username: userData.username,
    role: userData.role,
  };
}

// ============================================
// CREATE PRODUCT
// ============================================
export async function createProduct(values: {
  name: string;
  shortName: string;
  categoryId: string;
  sku: string;
  mrp: number;
  saleRate: number;
  purchaseRate: number;
}) {
  const userData = await getCachedSiteContext();

  const validated = productSchema.safeParse(values);
  if (!validated.success) return { error: validated.error.flatten() };

  const { name, shortName } = validated.data;

  const [existingByName, existingByShortName] = await Promise.all([
    db.product.findFirst({ where: { name, siteId: userData.siteId } }),
    db.product.findFirst({ where: { shortName, siteId: userData.siteId } }),
  ]);

  if (existingByName)
    return { error: { message: "Product with this name already exists." } };
  if (existingByShortName)
    return { error: { message: "Product with this short name already exists." } };

  const product = await db.product.create({
    data: {
      ...validated.data,
      siteId: userData.siteId,
      createdBy: userData.userId,
    },
  });

  await createAuditLog({
    siteId:     userData.siteId,
    userId:     userData.userId,
    userName:   userData.username,
    userRole:   userData.role,
    action:     "CREATE",
    entityType: "Product",
    entityId:   product.id,
    entityName: product.name,
    newValues:  product,
    changes:    `Created product: ${product.name} (${product.shortName})`,
  });

  revalidatePath("/miscellaneous/product");
  return { success: true };
}

// ============================================
// UPDATE PRODUCT
// ============================================
export async function updateProduct(
  id: string,
  values: {
    name: string;
    shortName: string;
    categoryId: string;
    sku: string;
    mrp: number;
    saleRate: number;
    purchaseRate: number;
  }
) {
  const userData = await getCachedSiteContext();

  const validated = productSchema.safeParse(values);
  if (!validated.success) return { error: validated.error.flatten() };

  const { name, shortName } = validated.data;

  const [oldProduct, existingByName, existingByShortName] = await Promise.all([
    db.product.findUnique({ where: { id, siteId: userData.siteId } }),
    db.product.findFirst({ where: { name, siteId: userData.siteId, NOT: { id } } }),
    db.product.findFirst({ where: { shortName, siteId: userData.siteId, NOT: { id } } }),
  ]);

  if (!oldProduct)
    return { error: { message: "Product not found or access denied" } };
  if (existingByName)
    return { error: { message: "Another product with this name already exists." } };
  if (existingByShortName)
    return { error: { message: "Another product with this short name already exists." } };

  const product = await db.product.update({
    where: { id, siteId: userData.siteId },
    data: validated.data,
  });

  await createAuditLog({
    siteId:     userData.siteId,
    userId:     userData.userId,
    userName:   userData.username,
    userRole:   userData.role,
    action:     "UPDATE",
    entityType: "Product",
    entityId:   product.id,
    entityName: product.name,
    oldValues:  oldProduct,
    newValues:  product,
    changes:    generateChangeSummary(oldProduct, product),
  });

  revalidatePath("/miscellaneous/product");
  return { success: true };
}

// ============================================
// DELETE PRODUCT
// ============================================
export async function deleteProduct(id: string) {
  const userData = await getCachedSiteContext();

  const product = await db.product.findUnique({
    where: { id, siteId: userData.siteId },
  });

  if (!product)
    return { error: { message: "Product not found or access denied" } };

  await db.product.delete({ where: { id, siteId: userData.siteId } });

  await createAuditLog({
    siteId:     userData.siteId,
    userId:     userData.userId,
    userName:   userData.username,
    userRole:   userData.role,
    action:     "DELETE",
    entityType: "Product",
    entityId:   id,
    entityName: product.name,
    oldValues:  product,
    changes:    `Deleted product: ${product.name} (${product.shortName})`,
  });

  revalidatePath("/miscellaneous/product");
  return { success: true };
}

// ============================================
// GET ALL PRODUCTS
// ============================================
export async function getAllProducts() {
  const { siteId } = await getCachedSiteContext();

  return await db.product.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
}

// ============================================
// SEARCH PRODUCTS (used by billing form)
// ============================================
export async function searchProducts(query: string) {
  const { siteId } = await getCachedSiteContext();

  if (!query || query.trim().length < 2) return [];

  return await db.product.findMany({
    where: {
      siteId,
      OR: [
        { name:      { contains: query, mode: "insensitive" } },
        { shortName: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { category: true },
    orderBy: { name: "asc" },
    take: 20,
  });
}