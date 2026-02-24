"use server";

import { db } from "@/lib/db";
import { serviceSchema } from "@/schemas/module";
import { revalidatePath } from "next/cache";
import { getSiteContext } from "@/lib/get-site-context";
import { createAuditLog, generateChangeSummary } from "@/lib/audit-logger";
import { AuditAction, Type } from "@prisma/client";

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

export async function createService(formData: FormData) {
  const { siteId, userId, username, role } = await getCachedSiteContext();
  
  const values = {
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
  };

  const validated = serviceSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  const [category, existingByName, existingByShortName] = await Promise.all([
    db.category.findFirst({
      where: { 
        id: validated.data.categoryId, 
        siteId, 
        type: Type.SERVICE 
      }
    }),
    db.service.findFirst({
      where: { name: validated.data.name, siteId }
    }),
    db.service.findFirst({
      where: { shortName: validated.data.shortName, siteId }
    })
  ]);

  if (!category) {
    return { error: { message: "SERVICE category not found or invalid type" } };
  }

  if (existingByName) {
    return { error: { message: "Service with this name already exists in your site." } };
  }

  if (existingByShortName) {
    return { error: { message: "Service with this short name already exists in your site." } };
  }

  try {
    const service = await db.service.create({ 
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
        description: validated.data.description || null,
        createdBy: userId,
        siteId,
        categoryId: validated.data.categoryId
      }
    });

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.CREATE,
      entityType: "Service",
      entityId: service.id,
      entityName: service.name,
      newValues: validated.data,
      changes: `Created service: ${service.name} (${service.shortName})`,
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/service`);
    return { success: true, data: service };
  } catch (error) {
    console.error("Create service error:", error);
    return { error: { message: "Failed to create service. Please try again." } };
  }
}

export async function updateService(
  id: string,
  values: { name: string; shortName: string; description?: string; categoryId: string }
) {
  const { siteId, userId, username, role } = await getCachedSiteContext();
  
  const validated = serviceSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  try {
    const [oldService, category, existingByName, existingByShortName] = await Promise.all([
      db.service.findFirst({
        where: { id, siteId }
      }),
      db.category.findFirst({
        where: { id: validated.data.categoryId, siteId, type: Type.SERVICE }
      }),
      db.service.findFirst({
        where: { name: validated.data.name, siteId, NOT: { id } }
      }),
      db.service.findFirst({
        where: { shortName: validated.data.shortName, siteId, NOT: { id } }
      })
    ]);

    if (!oldService) {
      return { error: { message: "Service not found or unauthorized access" } };
    }

    if (!category) {
      return { error: { message: "SERVICE category not found or invalid type" } };
    }

    if (existingByName) {
      return { error: { message: "Another service with this name already exists in your site." } };
    }

    if (existingByShortName) {
      return { error: { message: "Another service with this short name already exists in your site." } };
    }

    const service = await db.service.update({
      where: { id },
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
        description: validated.data.description || null,
        categoryId: validated.data.categoryId
      },
    });

    const oldValues = {
      name: oldService.name,
      shortName: oldService.shortName,
      description: oldService.description,
      categoryId: oldService.categoryId
    };

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.UPDATE,
      entityType: "Service",
      entityId: service.id,
      entityName: service.name,
      oldValues,
      newValues: validated.data,
      changes: generateChangeSummary(oldValues, validated.data),
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/service`);
    return { success: true, data: service };
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    console.error("Update service error:", error);
    if (err === "Service not found or unauthorized access") {
      return { error: { message: err } };
    }
    return { error: { message: "Failed to update service. Please try again." } };
  }
}

export async function deleteService(id: string) {
  const { siteId, userId, username, role } = await getCachedSiteContext();

  try {
    const [service, isUsedInAppointment] = await Promise.all([
      db.service.findFirst({
        where: { id, siteId }
      }),
      db.appointment.findFirst({
        where: { serviceId: id, siteId }
      })
    ]);

    if (!service) {
      return { error: { message: "Service not found or unauthorized access" } };
    }

    if (isUsedInAppointment) {
      return { error: { message: "This service is used in appointments and cannot be deleted." } };
    }

    await db.service.delete({ where: { id } });

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.DELETE,
      entityType: "Service",
      entityId: id,
      entityName: service.name,
      oldValues: {
        name: service.name,
        shortName: service.shortName,
        description: service.description,
        categoryId: service.categoryId
      },
      changes: `Deleted service: ${service.name} (${service.shortName})`,
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/service`);
    return { success: true };
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    console.error("Delete service error:", error);
    if (err === "Service not found or unauthorized access") {
      return { error: { message: err } };
    }
    return { error: { message: "Failed to delete service. Please try again." } };
  }
}

export async function getAllServices() {
  const { siteId } = await getCachedSiteContext();

  try {
    return await db.service.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
    });
  } catch (error) {
    console.error("Get services error:", error);
    throw new Error("Failed to fetch services");
  }
}

export async function getServiceById(id: string) {
  const { siteId } = await getCachedSiteContext();

  try {
    const service = await db.service.findFirst({
      where: { id, siteId },
      include: {
        category: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
    });

    if (!service) {
      throw new Error("Service not found or unauthorized access");
    }

    return service;
  } catch (error) {
    console.error("Get service error:", error);
    throw error;
  }
}

export async function getServicesByCategory(categoryId: string) {
  const { siteId } = await getCachedSiteContext();

  try {
    return await db.service.findMany({
      where: { siteId, categoryId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true
      }
    });
  } catch (error) {
    console.error("Get services by category error:", error);
    throw new Error("Failed to fetch services");
  }
}