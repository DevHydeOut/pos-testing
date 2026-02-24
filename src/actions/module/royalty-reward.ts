"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { royaltyRewardSchema, ActionResponse } from "@/schemas/royalty-reward";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function resolveRealSiteId(siteId: string): Promise<string | null> {
  const site = await db.mainSite.findUnique({
    where: { siteId },
    select: { id: true },
  });
  return site?.id ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createRoyaltyReward(
  siteId: string,
  createdBy: string,
  rawData: unknown
): Promise<ActionResponse> {
  if (!siteId?.trim()) {
    return { error: { message: "Site ID is missing. Please refresh and try again." } };
  }

  const realSiteId = await resolveRealSiteId(siteId);
  if (!realSiteId) return { error: { message: "Site not found." } };

  const parsed = royaltyRewardSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: { message: parsed.error.issues[0]?.message ?? "Validation failed" } };
  }

  const data = parsed.data;

  const existing = await db.royaltyReward.findUnique({
    where: { siteId_name: { siteId: realSiteId, name: data.name } },
  });
  if (existing) return { error: { message: "A reward with this name already exists." } };

  if (data.rewardType === "DISCOUNT") {
    const reward = await db.royaltyReward.create({
      data: {
        siteId: realSiteId,
        createdBy,
        name: data.name,
        rewardType: "DISCOUNT",
        pointsRequired: data.pointsRequired,
        couponName: data.couponName,
        discountPercent: data.discountPercent,
        discountMaxCap: data.discountMaxCap ?? null,
      },
    });
    revalidatePath(`/new-auth/site/${siteId}/royalty-reward`);
    return { success: true, id: reward.id };
  }

  const reward = await db.royaltyReward.create({
    data: {
      siteId: realSiteId,
      createdBy,
      name: data.name,
      rewardType: "PRODUCT",
      pointsRequired: data.pointsRequired,
      productId: data.productId,
      productQty: data.productQty,
    },
  });
  revalidatePath(`/new-auth/site/${siteId}/royalty-reward`);
  return { success: true, id: reward.id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteRoyaltyReward(id: string): Promise<ActionResponse> {
  if (!id?.trim()) return { error: { message: "Reward ID is missing." } };

  const reward = await db.royaltyReward.findUnique({ where: { id } });
  if (!reward) return { error: { message: "Reward not found." } };

  await db.royaltyReward.delete({ where: { id } });

  revalidatePath(`/new-auth/site/${reward.siteId}/royalty-reward`);
  return { success: true, id };
}

// ─── Get All Rewards for a Site ───────────────────────────────────────────────

export async function getRoyaltyRewards(siteId: string) {
  if (!siteId?.trim()) return [];

  const realSiteId = await resolveRealSiteId(siteId);
  if (!realSiteId) return [];

  return db.royaltyReward.findMany({
    where: { siteId: realSiteId },
    include: {
      product: {
        select: { id: true, name: true, currentStock: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateRoyaltyReward(
  id: string,
  rawData: unknown
): Promise<ActionResponse> {
  if (!id?.trim()) return { error: { message: "Reward ID is missing." } };

  const parsed = royaltyRewardSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: { message: parsed.error.issues[0]?.message ?? "Validation failed" } };
  }

  const data = parsed.data;

  const existing = await db.royaltyReward.findUnique({ where: { id } });
  if (!existing) return { error: { message: "Reward not found." } };

  // Check name uniqueness (exclude self)
  const duplicate = await db.royaltyReward.findFirst({
    where: { siteId: existing.siteId, name: data.name, NOT: { id } },
  });
  if (duplicate) return { error: { message: "A reward with this name already exists." } };

  if (data.rewardType === "DISCOUNT") {
    await db.royaltyReward.update({
      where: { id },
      data: {
        name: data.name,
        pointsRequired: data.pointsRequired,
        couponName: data.couponName,
        discountPercent: data.discountPercent,
        discountMaxCap: data.discountMaxCap ?? null,
      },
    });
  } else {
    await db.royaltyReward.update({
      where: { id },
      data: {
        name: data.name,
        pointsRequired: data.pointsRequired,
        productId: data.productId,
        productQty: data.productQty,
      },
    });
  }

  revalidatePath(`/new-auth/site/${existing.siteId}/royalty-reward`);
  return { success: true, id };
}

// ─── Toggle Status ────────────────────────────────────────────────────────────

export async function toggleRoyaltyRewardStatus(id: string): Promise<ActionResponse> {
  if (!id?.trim()) return { error: { message: "Reward ID is missing." } };

  const reward = await db.royaltyReward.findUnique({ where: { id } });
  if (!reward) return { error: { message: "Reward not found." } };

  await db.royaltyReward.update({
    where: { id },
    data: { status: reward.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });

  revalidatePath(`/new-auth/site/${reward.siteId}/royalty-reward`);
  return { success: true, id };
}