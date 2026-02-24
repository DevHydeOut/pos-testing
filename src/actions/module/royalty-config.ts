"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const DEFAULT_POINTS_PER_DOLLAR = 1; // 1 point per ₹1 — change this to adjust earning rate

// ─── Resolve URL siteId (uuid) → MainSite.id (cuid) ─────────────────────────
async function resolveRealSiteId(urlSiteId: string): Promise<string | null> {
  if (!urlSiteId?.trim()) return null;
  const site = await db.mainSite.findFirst({
    where: { siteId: urlSiteId },
    select: { id: true },
  });
  return site?.id ?? null;
}

// ─── Get or create royalty config for a site ─────────────────────────────────
export async function getRoyaltyConfig(realSiteId: string) {
  let config = await db.royaltyConfig.findUnique({ where: { siteId: realSiteId } });
  if (!config) {
    config = await db.royaltyConfig.create({
      data: {
        siteId: realSiteId,
        isEnabled: true,
        pointsPerAmount: DEFAULT_POINTS_PER_DOLLAR,
        amountPerPoint: 1,
        minBillForPoints: 0,
      },
    });
  }
  return config;
}

// ─── Look up royalty account by phone (uses URL siteId) ──────────────────────
export async function getRoyaltyAccountByPhone(urlSiteId: string, phone: string) {
  if (!phone || phone.trim().length < 5) return null;
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return null;
  return db.royaltyAccount.findUnique({
    where: { siteId_phone: { siteId: realSiteId, phone: phone.trim() } },
    select: {
      id: true, phone: true, customerName: true,
      currentPoints: true, totalPointsEarned: true, totalPointsRedeemed: true,
    },
  });
}

// ─── Earn points after a successful sale (uses URL siteId) ───────────────────
export async function earnRoyaltyPoints({
  urlSiteId, phone, customerName, saleId, saleBillNo, billAmount,
}: {
  urlSiteId: string; phone: string; customerName: string;
  saleId: string; saleBillNo: string; billAmount: number;
}) {
  if (!urlSiteId?.trim() || !phone?.trim()) return;

  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return;

  const config = await getRoyaltyConfig(realSiteId);
  if (!config.isEnabled || billAmount < config.minBillForPoints) return;

  const pointsEarned = Math.floor(billAmount * config.pointsPerAmount);
  if (pointsEarned <= 0) return;

  const account = await db.royaltyAccount.upsert({
    where: { siteId_phone: { siteId: realSiteId, phone: phone.trim() } },
    create: {
      siteId: realSiteId, phone: phone.trim(),
      customerName: customerName || "Customer",
      currentPoints: pointsEarned,
      totalPointsEarned: pointsEarned,
      totalPointsRedeemed: 0,
    },
    update: {
      customerName: customerName || undefined,
      currentPoints: { increment: pointsEarned },
      totalPointsEarned: { increment: pointsEarned },
    },
  });

  await db.royaltyPointTransaction.create({
    data: {
      accountId: account.id, siteId: realSiteId, points: pointsEarned,
      type: "EARNED", saleId, saleBillNo, billAmount,
      note: `Earned from sale ${saleBillNo}`,
    },
  });

  revalidatePath(`/new-auth/site/${urlSiteId}/billing`);
}

export async function redeemRoyaltyReward({
  urlSiteId, accountId, rewardId, saleId, saleBillNo, pointsUsed, discountApplied,
}: {
  urlSiteId: string;
  accountId: string;
  rewardId: string;
  saleId: string;
  saleBillNo: string;
  pointsUsed: number;
  discountApplied: number;
}) {
  if (!urlSiteId?.trim() || !accountId?.trim()) return;

  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return;

  // Deduct points
  await db.royaltyAccount.update({
    where: { id: accountId },
    data: {
      currentPoints:       { decrement: pointsUsed },
      totalPointsRedeemed: { increment: pointsUsed },
    },
  });

  // Create redemption record
  const redemption = await db.royaltyRedemption.create({
    data: {
      accountId,
      rewardId,
      siteId: realSiteId,
      pointsUsed,
      discountApplied,
      saleId,
      saleBillNo,
      status: "APPLIED",
      usedAt: new Date(),
    },
  });

  // Create point transaction log
  await db.royaltyPointTransaction.create({
    data: {
      accountId,
      siteId: realSiteId,
      points:      -pointsUsed,
      type:        "REDEEMED",
      saleId,
      saleBillNo,
      redemptionId: redemption.id,
      note:        `Redeemed on bill ${saleBillNo}`,
    },
  });

  revalidatePath(`/new-auth/site/${urlSiteId}/billing`);
}