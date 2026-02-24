"use server";

import { db } from "@/lib/db";
import { referenceSchema } from "@/schemas/module";
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";
import { createAuditLog, generateChangeSummary } from "@/lib/audit-logger";
import { AuditAction } from "@prisma/client";

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

async function verifyReferenceOwnership(referenceId: string, siteId: string) {
  const reference = await db.reference.findFirst({
    where: { id: referenceId, siteId }
  });
  
  if (!reference) {
    throw new Error("Reference not found or unauthorized access");
  }
  
  return reference;
}

export async function createReference(formData: FormData) {
  const { siteId, userId, username, role } = await getCachedSiteContext();
  
  const values = {
    name: formData.get("name"),
    shortName: formData.get("shortName"),
  };

  const validated = referenceSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  const [existingByName, existingByShortName] = await Promise.all([
    db.reference.findFirst({
      where: { name: validated.data.name, siteId }
    }),
    db.reference.findFirst({
      where: { shortName: validated.data.shortName, siteId }
    })
  ]);

  if (existingByName) {
    return { error: { message: "Reference with this name already exists in your site." } };
  }

  if (existingByShortName) {
    return { error: { message: "Reference with this short name already exists in your site." } };
  }

  try {
    const newReference = await db.reference.create({ 
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
        siteId,
        createdBy: userId
      }
    });

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.CREATE,
      entityType: "Reference",
      entityId: newReference.id,
      entityName: newReference.name,
      newValues: {
        name: newReference.name,
        shortName: newReference.shortName
      },
      changes: `Created Reference: ${newReference.name} (${newReference.shortName})`
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/reference`);
    return { success: true, data: newReference };
  } catch (error) {
    console.error("Create reference error:", error);
    return { error: { message: "Failed to create Reference. Please try again." } };
  }
}

export async function updateReference(
  id: string,
  values: { name: string; shortName: string }
) {
  const { siteId, userId, username, role } = await getCachedSiteContext();

  const validated = referenceSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  try {
    const [existingReference, existingByName, existingByShortName] = await Promise.all([
      verifyReferenceOwnership(id, siteId),
      db.reference.findFirst({
        where: { name: validated.data.name, siteId, NOT: { id } }
      }),
      db.reference.findFirst({
        where: { shortName: validated.data.shortName, siteId, NOT: { id } }
      })
    ]);

    if (existingByName) {
      return { error: { message: "Another Reference with this name already exists in your site." } };
    }

    if (existingByShortName) {
      return { error: { message: "Another Reference with this short name already exists in your site." } };
    }

    const updatedReference = await db.reference.update({
      where: { id },
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
      },
    });

    const oldValues = {
      name: existingReference.name,
      shortName: existingReference.shortName
    };
    
    const newValues = {
      name: validated.data.name,
      shortName: validated.data.shortName
    };
    
    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.UPDATE,
      entityType: "Reference",
      entityId: updatedReference.id,
      entityName: updatedReference.name,
      oldValues,
      newValues,
      changes: generateChangeSummary(oldValues, newValues)
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/reference`);
    return { success: true, data: updatedReference };
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : "Unknown error";
    console.error("Update reference error:", error);
    if (err === "Reference not found or unauthorized access") {
      return { error: { message: err } };
    }
    return { error: { message: "Failed to update Reference. Please try again." } };
  }
}

export async function deleteReference(id: string) {
  const { siteId, userId, username, role } = await getCachedSiteContext();

  try {
    const [reference, isUsedInAppointment] = await Promise.all([
      verifyReferenceOwnership(id, siteId),
      db.appointment.findFirst({ 
        where: { referenceId: id, siteId } 
      })
    ]);
    
    if (isUsedInAppointment) {
      return { error: { message: "This Reference is used in appointments and cannot be deleted." } };
    }

    await db.reference.delete({ where: { id } });

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.DELETE,
      entityType: "Reference",
      entityId: id,
      entityName: reference.name,
      oldValues: {
        name: reference.name,
        shortName: reference.shortName
      },
      changes: `Deleted Reference: ${reference.name} (${reference.shortName})`
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/reference`);
    return { success: true };
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete reference error:", error);
    if (err === "Reference not found or unauthorized access") {
      return { error: { message: err } };
    }
    return { error: { message: "Failed to delete Reference. Please try again." } };
  }
}

export async function getAllReferences() {
  const { siteId } = await getCachedSiteContext();

  try {
    const references = await db.reference.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            appointments: true
          }
        },
      },
    });

    return references;
  } catch (error) {
    console.error("Get references error:", error);
    throw new Error("Failed to fetch references");
  }
}

export async function getReferenceById(id: string) {
  const { siteId } = await getCachedSiteContext();

  try {
    const reference = await db.reference.findFirst({
      where: { id, siteId },
      include: {
        _count: {
          select: {
            appointments: true
          }
        },
      },
    });

    if (!reference) {
      throw new Error("Reference not found or unauthorized access");
    }

    return reference;
  } catch (error) {
    console.error("Get reference error:", error);
    throw error;
  }
}

export async function getReferencesForDropdown() {
  const { siteId } = await getCachedSiteContext();

  try {
    const references = await db.reference.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true
      }
    });

    return references;
  } catch (error) {
    console.error("Get references for dropdown error:", error);
    throw new Error("Failed to fetch references");
  }
}