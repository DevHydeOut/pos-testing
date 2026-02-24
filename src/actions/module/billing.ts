"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";
import { createAuditLog } from "@/lib/audit-logger";

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

export async function generateBillNo(siteId?: string) {
  const contextSiteId = siteId || (await getCachedSiteContext()).siteId;
  
  const lastSale = await db.sale.findFirst({
    where: { siteId: contextSiteId },
    orderBy: { createdAt: "desc" },
    select: { billNo: true }
  });

  const nextBill = lastSale && lastSale.billNo
    ? parseInt(lastSale.billNo.replace("SALE", "")) + 1
    : 1;

  return `SALE${String(nextBill).padStart(4, "0")}`;
}

export async function searchProducts(searchTerm: string) {
  const { siteId } = await getCachedSiteContext();

  if (!searchTerm.trim()) return [];

  const products = await db.product.findMany({
    where: {
      siteId,
      OR: [
        { name:      { contains: searchTerm, mode: "insensitive" } },
        { shortName: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    select: {
      id:           true,
      name:         true,
      mrp:          true,
      saleRate:     true,
      purchaseRate: true,
      currentStock: true,
      sku:          true,
    },
    orderBy: { name: "asc" },
    take:    10,
  });

  // Return products with gst/cgst/sgst as 0 (tax handled by SiteTaxConfig)
  return products.map((p) => ({
    ...p,
    gst:          0,
    cgst:         0,
    sgst:         0,
    hsnCodeValue: undefined,
  }));
}

export async function getPatientWithAppointment(patientId: string, date: Date) {
  const { siteId } = await getCachedSiteContext();
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const patient = await db.patient.findUnique({
    where: { id: patientId, siteId },
    include: {
      appointments: {
        where: {
          siteId,
          slot: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          consultant: { select: { name: true } },
          service: { select: { name: true } }
        },
        orderBy: { slot: "desc" },
        take: 1
      }
    }
  });

  return patient;
}

interface SaleItemInput {
  productId: string;
  batchId?: string;
  productName: string;
  batchNumber?: string;
  quantity: number;
  mrp: number;
  saleRate: number;
  discount: number;
  taxPercent: number;
  expiryDate?: Date;
}

interface CreateSaleInput {
  billType: "CONSULTATION" | "WALKIN" | "RETURN" | "COURIER";
  patientId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  appointmentId?: string;
  consultantId?: string;
  remark?: string;
  grossAmount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  returnForBillNo?: string;
  returnReason?: string;
  items: SaleItemInput[];
}

export async function createSale(data: CreateSaleInput) {
  const userData = await getCachedSiteContext();
  
  try {
    const billNo = await generateBillNo(userData.siteId);
    const dueAmount = data.netAmount - data.paidAmount;
    
    let paymentStatus: "PAID" | "UNPAID" | "PARTIAL" = "UNPAID";
    if (data.paidAmount >= data.netAmount) {
      paymentStatus = "PAID";
    } else if (data.paidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          billNo,
          billType: data.billType,
          siteId: userData.siteId,
          patientId: data.patientId || null,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          appointmentId: data.appointmentId,
          consultantId: data.consultantId,
          remark: data.remark,
          grossAmount: data.grossAmount,
          discount: data.discount,
          netAmount: data.netAmount,
          paidAmount: data.paidAmount,
          dueAmount,
          paymentStatus,
          returnForBillNo: data.returnForBillNo,
          returnReason: data.returnReason,
          createdBy: userData.userId,
        },
      });

      for (const item of data.items) {
        const taxAmount = (item.saleRate * item.quantity * item.taxPercent) / 100;
        const totalAmount = (item.saleRate * item.quantity) - item.discount + taxAmount;

        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            batchId: item.batchId,
            productName: item.productName,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            mrp: item.mrp,
            saleRate: item.saleRate,
            discount: item.discount,
            taxPercent: item.taxPercent,
            taxAmount,
            totalAmount,
            expiryDate: item.expiryDate,
          },
        });

        const quantityChange = data.billType === "RETURN" ? item.quantity : -item.quantity;
        
        await tx.product.update({
          where: { id: item.productId, siteId: userData.siteId },
          data: { currentStock: { increment: quantityChange } }
        });

        if (item.batchId) {
          await tx.stockBatch.update({
            where: { id: item.batchId, siteId: userData.siteId },
            data: { remainingQty: { increment: quantityChange } }
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            batchId: item.batchId,
            siteId: userData.siteId,
            type: data.billType === "RETURN" ? "RETURN" : "SALE",
            quantity: Math.abs(item.quantity),
            location: "PHARMACY",
            mrp: item.mrp,
            saleRate: item.saleRate,
            remark: `Bill No: ${billNo}`,
            createdBy: userData.userId,
          }
        });
      }

      return newSale;
    });

    await createAuditLog({
      siteId: userData.siteId,
      userId: userData.userId,
      userName: userData.username,
      userRole: userData.role,
      action: 'CREATE',
      entityType: 'Sale',
      entityId: sale.id,
      entityName: sale.billNo,
      newValues: sale,
      changes: `Created ${data.billType} sale: ${sale.billNo} - ₹${sale.netAmount}`,
    });

    revalidatePath("/billing");
    return { success: true, billNo: sale.billNo, saleId: sale.id };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    console.error("Error creating sale:", error);
    return { success: false, error: (err.message as string) || "Failed to create sale" };
  }
}

export async function getSaleById(saleId: string) {
  const { siteId } = await getCachedSiteContext();
  
  return db.sale.findUnique({
    where: { id: saleId, siteId },
    include: {
      patient: true,
      appointment: {
        include: {
          consultant: true,
          service: true
        }
      },
      consultant: true,
      items: {
        include: {
          product: true,
          batch: true
        }
      }
    }
  });
}

export async function getSaleByBillNo(billNo: string) {
  const { siteId } = await getCachedSiteContext();
  
  return db.sale.findFirst({
    where: { billNo, siteId },
    include: {
      patient: true,
      appointment: {
        include: {
          consultant: true,
          service: true
        }
      },
      consultant: true,
      items: {
        include: {
          product: true,
          batch: true
        }
      }
    }
  });
}

interface SaleFilter {
  billType?: string;
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getAllSales(filters?: SaleFilter) {
  const { siteId } = await getCachedSiteContext();
  
  return db.sale.findMany({
    where: {
      siteId,
      billType: filters?.billType as "CONSULTATION" | "WALKIN" | "RETURN" | "COURIER" | undefined,
      patientId: filters?.patientId,
      createdAt: {
        gte: filters?.startDate,
        lte: filters?.endDate,
      }
    },
    include: {
      patient: { select: { uhid: true, name: true, phone: true } },
      consultant: { select: { name: true } },
      items: {
        select: {
          productName: true,
          quantity: true,
          totalAmount: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getSalePrintData(saleId: string) {
  const sale = await getSaleById(saleId);
  if (!sale) return null;

  return {
    billNo: sale.billNo,
    billType: sale.billType,
    createdAt: sale.createdAt,
    customerName: sale.customerName || sale.patient?.name || "Walk-in Customer",
    customerPhone: sale.customerPhone || sale.patient?.phone,
    patientUHID: sale.patient?.uhid,
    items: sale.items.map((item) => ({
      productName: item.productName,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      saleRate: item.saleRate,
      discount: item.discount,
      totalAmount: item.totalAmount,
    })),
    grossAmount: sale.grossAmount,
    discount: sale.discount,
    netAmount: sale.netAmount,
    paidAmount: sale.paidAmount,
    dueAmount: sale.dueAmount,
    paymentStatus: sale.paymentStatus,
    remark: sale.remark,
  };
}

interface UpdateSaleInput {
  id: string;
  items: Array<{
    id: string;
    quantity: number;
    discount: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  billDiscount: number;
  remark: string;
  editReason: string;
  grossAmount: number;
  discount: number;
  netAmount: number;
  totalTax: number;
}

export async function updateSale(data: UpdateSaleInput) {
  const userData = await getCachedSiteContext();
  
  try {
    const updatedSale = await db.$transaction(async (tx) => {
      const originalSale = await tx.sale.findUnique({
        where: { id: data.id, siteId: userData.siteId },
        include: { items: true }
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      for (const originalItem of originalSale.items) {
        await tx.product.update({
          where: { id: originalItem.productId, siteId: userData.siteId },
          data: { currentStock: { increment: originalItem.quantity } }
        });

        if (originalItem.batchId) {
          await tx.stockBatch.update({
            where: { id: originalItem.batchId, siteId: userData.siteId },
            data: { remainingQty: { increment: originalItem.quantity } }
          });
        }
      }

      for (const item of data.items) {
        await tx.saleItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            discount: item.discount,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
          }
        });

        const saleItem = originalSale.items.find(i => i.id === item.id);
        if (saleItem) {
          await tx.product.update({
            where: { id: saleItem.productId, siteId: userData.siteId },
            data: { currentStock: { decrement: item.quantity } }
          });

          if (saleItem.batchId) {
            await tx.stockBatch.update({
              where: { id: saleItem.batchId, siteId: userData.siteId },
              data: { remainingQty: { decrement: item.quantity } }
            });
          }

          await tx.stockMovement.create({
            data: {
              productId: saleItem.productId,
              batchId: saleItem.batchId,
              siteId: userData.siteId,
              type: "ADJUSTMENT",
              quantity: Math.abs(item.quantity - saleItem.quantity),
              location: "PHARMACY",
              mrp: saleItem.mrp,
              saleRate: saleItem.saleRate,
              remark: `Bill ${originalSale.billNo} edited: ${data.editReason}`,
              createdBy: userData.userId,
            }
          });
        }
      }

      const dueAmount = data.netAmount - originalSale.paidAmount;
      let paymentStatus: "PAID" | "UNPAID" | "PARTIAL" = "UNPAID";
      if (originalSale.paidAmount >= data.netAmount) {
        paymentStatus = "PAID";
      } else if (originalSale.paidAmount > 0) {
        paymentStatus = "PARTIAL";
      }

      const updated = await tx.sale.update({
        where: { id: data.id, siteId: userData.siteId },
        data: {
          grossAmount: data.grossAmount,
          discount: data.discount,
          netAmount: data.netAmount,
          dueAmount,
          paymentStatus,
          remark: data.remark,
          isEdited: true,
          editedAt: new Date(),
          editedBy: userData.userId,
          editReason: data.editReason,
        },
        include: {
          patient: true,
          items: true,
        }
      });

      return updated;
    });

    await createAuditLog({
      siteId: userData.siteId,
      userId: userData.userId,
      userName: userData.username,
      userRole: userData.role,
      action: 'UPDATE',
      entityType: 'Sale',
      entityId: data.id,
      entityName: updatedSale.billNo,
      newValues: updatedSale,
      changes: `Updated sale: ${updatedSale.billNo}. Reason: ${data.editReason}`,
    });

    revalidatePath("/billing");
    return { success: true, sale: updatedSale };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    console.error("Error updating sale:", error);
    return { success: false, error: (err.message as string) || "Failed to update sale" };
  }
}

export async function getSaleEditHistory(saleId: string) {
  const { siteId } = await getCachedSiteContext();
  
  const sale = await db.sale.findUnique({
    where: { id: saleId, siteId },
    select: {
      isEdited: true,
      editedAt: true,
      editReason: true,
      createdAt: true,
    }
  });

  return sale;
}