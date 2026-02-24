"use server";

import { db } from "@/lib/db";
import { stockBatchSchema } from "@/schemas/stock";
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";

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
        }
      },
    });
    
    await Promise.all(
      movements.map((movement) =>
        tx.product.update({
          where: { 
            id: movement.productId,
            siteId
          },
          data: {
            currentStock: {
              increment: movement.quantity
            }
          }
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

interface StockMapValue {
  product: Record<string, unknown>;
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