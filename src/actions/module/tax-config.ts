"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getProvinceTax, CANADIAN_PROVINCES } from "@/lib/canada-tax"; // FIX: removed unused ProvinceTax import

// ── Resolve URL siteId (uuid) → MainSite.id (cuid) ───────────────────────────
async function resolveRealSiteId(urlSiteId: string): Promise<string | null> {
  if (!urlSiteId?.trim()) return null;
  const site = await db.mainSite.findFirst({
    where: { siteId: urlSiteId },
    select: { id: true },
  });
  return site?.id ?? null;
}

// ── Get tax config for a site (creates default Ontario config if missing) ─────
export async function getSiteTaxConfig(urlSiteId: string) {
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return null;

  let config = await db.siteTaxConfig.findUnique({
    where: { siteId: realSiteId },
  });

  // Auto-create with Ontario defaults if no config exists yet
  if (!config) {
    const ontario = getProvinceTax("ON")!;
    config = await db.siteTaxConfig.create({
      data: {
        siteId:       realSiteId,
        provinceCode: ontario.code,
        provinceName: ontario.name,
        gstRate:      ontario.gstRate,
        hstRate:      ontario.hstRate,
        pstRate:      ontario.pstRate,
        qstRate:      ontario.qstRate,
        totalRate:    ontario.totalRate,
        isEnabled:    true,
      },
    });
  }

  return config;
}

// ── Update province — syncs all rates from the constants file ─────────────────
export async function updateSiteTaxProvince(
  urlSiteId: string,
  provinceCode: string
) {
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return { success: false, error: "Site not found" };

  const province = getProvinceTax(provinceCode);
  if (!province) return { success: false, error: `Unknown province: ${provinceCode}` };

  try {
    await db.siteTaxConfig.upsert({
      where: { siteId: realSiteId },
      create: {
        siteId:       realSiteId,
        provinceCode: province.code,
        provinceName: province.name,
        gstRate:      province.gstRate,
        hstRate:      province.hstRate,
        pstRate:      province.pstRate,
        qstRate:      province.qstRate,
        totalRate:    province.totalRate,
        isEnabled:    true,
      },
      update: {
        provinceCode: province.code,
        provinceName: province.name,
        gstRate:      province.gstRate,
        hstRate:      province.hstRate,
        pstRate:      province.pstRate,
        qstRate:      province.qstRate,
        totalRate:    province.totalRate,
      },
    });

    revalidatePath(`/new-auth/site/${urlSiteId}/settings`);
    return { success: true, province };
  } catch (error: unknown) {  // FIX: line 85 — was `any`
    const msg = error instanceof Error ? error.message : "Failed to update";
    return { success: false, error: msg };
  }
}

// ── Update tax registration numbers (for receipts) ────────────────────────────
export async function updateTaxRegistrationNumbers(
  urlSiteId: string,
  numbers: { gstNumber?: string; pstNumber?: string; qstNumber?: string }
) {
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return { success: false, error: "Site not found" };

  try {
    await db.siteTaxConfig.update({
      where: { siteId: realSiteId },
      data: {
        gstNumber: numbers.gstNumber ?? null,
        pstNumber: numbers.pstNumber ?? null,
        qstNumber: numbers.qstNumber ?? null,
      },
    });

    revalidatePath(`/new-auth/site/${urlSiteId}/settings`);
    return { success: true };
  } catch (error: unknown) {  // FIX: line 110 — was `any`
    const msg = error instanceof Error ? error.message : "Failed to update";
    return { success: false, error: msg };
  }
}

// ── Toggle tax on/off for the site ────────────────────────────────────────────
export async function toggleSiteTax(urlSiteId: string, isEnabled: boolean) {
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return { success: false, error: "Site not found" };

  try {
    await db.siteTaxConfig.update({
      where: { siteId: realSiteId },
      data: { isEnabled },
    });
    revalidatePath(`/new-auth/site/${urlSiteId}/settings`);
    return { success: true };
  } catch (error: unknown) {  // FIX: line 127 — was `any`
    const msg = error instanceof Error ? error.message : "Failed to update";
    return { success: false, error: msg };
  }
}

// ── Override a specific rate (advanced — use sparingly) ───────────────────────
export async function overrideTaxRate(
  urlSiteId: string,
  rates: { gstRate?: number; hstRate?: number; pstRate?: number; qstRate?: number }
) {
  const realSiteId = await resolveRealSiteId(urlSiteId);
  if (!realSiteId) return { success: false, error: "Site not found" };

  try {
    const current = await db.siteTaxConfig.findUnique({ where: { siteId: realSiteId } });
    if (!current) return { success: false, error: "No tax config found" };

    const gst = rates.gstRate ?? current.gstRate;
    const hst = rates.hstRate ?? current.hstRate;
    const pst = rates.pstRate ?? current.pstRate;
    const qst = rates.qstRate ?? current.qstRate;

    await db.siteTaxConfig.update({
      where: { siteId: realSiteId },
      data: {
        gstRate:   gst,
        hstRate:   hst,
        pstRate:   pst,
        qstRate:   qst,
        totalRate: gst + hst + pst + qst,
      },
    });

    revalidatePath(`/new-auth/site/${urlSiteId}/settings`);
    return { success: true };
  } catch (error: unknown) {  // FIX: line 162 — was `any`
    const msg = error instanceof Error ? error.message : "Failed to update";
    return { success: false, error: msg };
  }
}

// ── Get all provinces (for dropdowns) ─────────────────────────────────────────
export async function getAllProvinces() {
  return CANADIAN_PROVINCES;
}

export async function getSiteTaxConfigByUrlId(urlSiteId: string) {
  return getSiteTaxConfig(urlSiteId); // already handles uuid→cuid resolution
}