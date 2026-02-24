"use server";

import { db } from "@/lib/db";
import { stockBatchSchema, transferStockSchema } from "@/schemas/stock"; // ✅ FIX 1: import transferStockSchema
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";
import { Product } from "@prisma/client"; // ✅ FIX 2: import Product type

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

export async function createStockBatch(values: unknown) {
  const { siteId, userId } = await getCachedSiteContext();

  const validated = stockBatchSchema.safeParse(values);
  if (!validated.success) return { error: validated.error.flatten() };

  const { movements } = validated.data;

  const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);

  const batch = await db.$transaction(async (tx) => {
    const newBatch = await tx.stockBatch.create({
      data: {
        remainingQty: totalQuantity,
        siteId,
        createdBy: userId,
        movements: {
          create: movements.map((m) => ({
            productId: m.productId,
            type: "IN",
            quantity: m.quantity,
            location: m.location,
            mrp: m.mrp || undefined,
            saleRate: m.saleRate || undefined,
            purchaseRate: m.purchaseRate || undefined,
            batchNumber: m.batchNumber || undefined,
            expiryDate: m.expiryDate || undefined,
            remark: m.remark || undefined,
            siteId,
            createdBy: userId,
          })),
        },
      },
    });

    await Promise.all(
      movements.map((movement) =>
        tx.product.update({
          where: {
            id: movement.productId,
            siteId,
          },
          data: {
            currentStock: {
              increment: movement.quantity,
            },
          },
        })
      )
    );

    return newBatch;
  });

  revalidatePath("/stock");
  return { success: true, batch };
}

export async function getAllStockBatches() {
  const { siteId } = await getCachedSiteContext();

  return await db.stockBatch.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    include: {
      movements: {
        include: {
          product: true,
        },
      },
    },
  });
}

interface StockByProductParams {
  from?: Date;
  to?: Date;
}

// ✅ FIX 2: Use proper Product type instead of Record<string, unknown>
interface StockMapValue {
  product: Product;
  totalQuantity: number;
  lastUpdated: Date;
}

export async function getStockByProduct({ from, to }: StockByProductParams) {
  const { siteId } = await getCachedSiteContext();

  const whereClause: Record<string, unknown> = { siteId };

  if (from && to) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    whereClause.createdAt = { gte: fromDate, lte: toDate };
  }

  const movements = await db.stockMovement.findMany({
    where: whereClause,
    include: { product: true },
  });

  const stockMap = new Map<string, StockMapValue>();

  for (const m of movements) {
    const existing = stockMap.get(m.productId);
    if (existing) {
      existing.totalQuantity += m.quantity;
      existing.lastUpdated =
        m.createdAt > existing.lastUpdated ? m.createdAt : existing.lastUpdated;
    } else {
      stockMap.set(m.productId, {
        product: m.product,
        totalQuantity: m.quantity,
        lastUpdated: m.createdAt,
      });
    }
  }

  return Array.from(stockMap.values());
}

export async function getStockMovementsByProduct(productId: string) {
  const { siteId } = await getCachedSiteContext();

  return await db.stockMovement.findMany({
    where: {
      productId,
      siteId,
    },
    include: {
      product: true,
      batch: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getLowStockProducts(threshold: number = 10) {
  const { siteId } = await getCachedSiteContext();

  return await db.product.findMany({
    where: {
      siteId,
      currentStock: {
        lte: threshold,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      currentStock: "asc",
    },
  });
}

export async function getExpiringBatches(daysAhead: number = 30) {
  const { siteId } = await getCachedSiteContext();

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const movements = await db.stockMovement.findMany({
    where: {
      siteId,
      type: "IN",
      expiryDate: {
        lte: futureDate,
        gte: today,
      },
      batch: {
        remainingQty: {
          gt: 0,
        },
      },
    },
    include: {
      product: true,
      batch: true,
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  return movements;
}

interface AdjustStockValues {
  productId: string;
  quantity: number;
  type: "ADJUSTMENT";
  reason: string;
}

export async function adjustStock(values: AdjustStockValues) {
  const { siteId, userId } = await getCachedSiteContext();

  const result = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: values.productId, siteId },
    });

    if (!product) {
      throw new Error("Product not found or unauthorized access");
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: values.productId,
        type: values.type,
        quantity: Math.abs(values.quantity),
        location: "PHARMACY",
        remark: values.reason,
        siteId,
        createdBy: userId,
      },
    });

    const updatedProduct = await tx.product.update({
      where: { id: values.productId, siteId },
      data: {
        currentStock: {
          increment: values.quantity,
        },
      },
    });

    return { movement, product: updatedProduct };
  });

  revalidatePath("/stock");
  return { success: true, ...result };
}

// ── Get all sites belonging to the same MainUser (for destination dropdown) ────
export async function getSiblinSites() {
  const userData = await getSiteContext();
  const siteId = userData.siteId;

  const currentSite = await db.mainSite.findUnique({
    where: { id: siteId },
    select: { mainUserId: true, name: true },
  });

  if (!currentSite) return { error: "Current site not found" };

  const sites = await db.mainSite.findMany({
    where: {
      mainUserId: currentSite.mainUserId,
      id: { not: siteId },
    },
    select: {
      id: true,
      name: true,
      siteId: true,
    },
    orderBy: { name: "asc" },
  });

  return { sites };
}

// ── Transfer stock: deduct from source, credit to destination atomically ───────
export async function transferStock(values: unknown) {
  const userData = await getSiteContext();
  const sourceSiteId = userData.siteId;
  const userId = userData.id;

  const validated = transferStockSchema.safeParse(values);
  if (!validated.success) return { error: validated.error.flatten() };

  const { destinationSiteId, remark, items } = validated.data;

  if (destinationSiteId === sourceSiteId) {
    return { error: "Source and destination sites cannot be the same." };
  }

  const [sourceSite, destSite] = await Promise.all([
    db.mainSite.findUnique({ where: { id: sourceSiteId }, select: { mainUserId: true, name: true } }),
    db.mainSite.findUnique({ where: { id: destinationSiteId }, select: { mainUserId: true, name: true } }),
  ]);

  if (!sourceSite || !destSite) return { error: "Invalid site selected." };
  if (sourceSite.mainUserId !== destSite.mainUserId) {
    return { error: "Cannot transfer stock to a site from a different account." };
  }

  const productIds = items.map((i) => i.productId);

  // ── Pre-flight 1: fetch source products with category ─────────────────────────
  const sourceProductsFull = await db.product.findMany({
    where: { id: { in: productIds }, siteId: sourceSiteId },
    include: { category: true },
  });

  if (sourceProductsFull.length !== productIds.length) {
    return { error: "One or more products not found in this site." };
  }

  // ── Pre-flight 2: stock + category checks ─────────────────────────────────────
  // KEY FIX: look up destination products by NAME (not id — ids are globally unique per product)
  for (const item of items) {
    const sourceProduct = sourceProductsFull.find((p) => p.id === item.productId);
    if (!sourceProduct) return { error: "Product not found." };

    // Stock check
    if (sourceProduct.currentStock < item.quantity) {
      return {
        error: `Not enough stock for "${sourceProduct.name}". Available: ${sourceProduct.currentStock}, Requested: ${item.quantity}.`,
      };
    }

    // Check if product already exists in destination site BY NAME
    const destProductExists = await db.product.findFirst({
      where: { siteId: destinationSiteId, name: sourceProduct.name },
      select: { id: true },
    });

    if (!destProductExists) {
      // Product doesn't exist in destination — verify matching category exists
      const destCategory = await db.category.findFirst({
        where: {
          siteId: destinationSiteId,
          name: sourceProduct.category.name,
          type: sourceProduct.category.type,
        },
        select: { id: true },
      });

      if (!destCategory) {
        return {
          error: `Cannot transfer "${sourceProduct.name}" — the category "${sourceProduct.category.name}" doesn't exist in ${destSite.name}. Please create this category in the destination site first.`,
        };
      }
    }
  }

  // ── All checks passed — run atomic transaction ────────────────────────────────
  try {
    await db.$transaction(async (tx) => {
      const transferRef = `TRANSFER-${Date.now()}`;

      for (const item of items) {
        const sourceProduct = sourceProductsFull.find((p) => p.id === item.productId)!;

        // 1. Deduct from source
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            siteId: sourceSiteId,
            type: "TRANSFER",
            quantity: item.quantity,
            location: "STORE",
            remark: remark ? `Transfer to ${destSite.name}: ${remark}` : `Transfer to ${destSite.name}`,
            sourceType: "TRANSFER",
            sourceId: transferRef,
            createdBy: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId, siteId: sourceSiteId },
          data: { currentStock: { decrement: item.quantity } },
        });

        // 2. Credit destination — look up by NAME in destination site
        const destProduct = await tx.product.findFirst({
          where: { siteId: destinationSiteId, name: sourceProduct.name },
        });

        let destProductId: string;

        if (destProduct) {
          // Product already exists in destination — increment its stock
          await tx.product.update({
            where: { id: destProduct.id },
            data: { currentStock: { increment: item.quantity } },
          });
          destProductId = destProduct.id;
        } else {
          // Auto-create product in destination (category guaranteed by pre-flight)
          const destCategory = await tx.category.findFirst({
            where: {
              siteId: destinationSiteId,
              name: sourceProduct.category.name,
              type: sourceProduct.category.type,
            },
          });

          const newProduct = await tx.product.create({
            data: {
              name: sourceProduct.name,
              shortName: sourceProduct.shortName,
              categoryId: destCategory!.id,
              siteId: destinationSiteId,
              sku: sourceProduct.sku,
              mrp: sourceProduct.mrp,
              saleRate: sourceProduct.saleRate,
              purchaseRate: sourceProduct.purchaseRate,
              currentStock: item.quantity,
              createdBy: userId,
            },
          });
          destProductId = newProduct.id;
        }

        // IN movement for destination
        await tx.stockMovement.create({
          data: {
            productId: destProductId,
            siteId: destinationSiteId,
            type: "TRANSFER",
            quantity: item.quantity,
            location: "STORE",
            remark: remark ? `Transfer from ${sourceSite.name}: ${remark}` : `Transfer from ${sourceSite.name}`,
            sourceType: "TRANSFER",
            sourceId: transferRef,
            createdBy: userId,
          },
        });
      }
    });
  } catch (err) {
    // Catch any unexpected DB errors and return as clean error instead of crash page
    const message = err instanceof Error ? err.message : "Transfer failed due to an unexpected error.";
    return { error: message };
  }

  revalidatePath("/stock");
  return { success: true };
}



// ── Get transfer history for current site (in + out) ─────────────────────────
export async function getTransferHistory() {
  const userData = await getSiteContext();
  const siteId = userData.siteId;

  const movements = await db.stockMovement.findMany({
    where: {
      siteId,
      type: "TRANSFER",
    },
    include: {
      product: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return movements;
}