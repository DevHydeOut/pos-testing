"use server";

import { db } from "@/lib/db";
import { categorySchema } from "@/schemas/module";
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

async function verifyCategoryOwnership(categoryId: string, siteId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, siteId }
  });
  
  if (!category) {
    throw new Error("Category not found or unauthorized access");
  }
  
  return category;
}

export async function createCategory(formData: FormData) {
  const context = await getCachedSiteContext();
  const { siteId, userId, username, role } = context;
  
  const values = {
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    type: formData.get("type"),
  };

  const validated = categorySchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  const [existingByName, existingByShortName] = await Promise.all([
    db.category.findFirst({
      where: { name: validated.data.name, siteId, type: validated.data.type },
    }),
    db.category.findFirst({
      where: { shortName: validated.data.shortName, siteId, type: validated.data.type },
    })
  ]);

  if (existingByName) {
    return { error: { message: `${validated.data.type} category with this name already exists in your site.` } };
  }

  if (existingByShortName) {
    return { error: { message: `${validated.data.type} category with this short name already exists in your site.` } };
  }

  try {
    const newCategory = await db.category.create({ 
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
        type: validated.data.type,
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
      entityType: "Category",
      entityId: newCategory.id,
      entityName: newCategory.name,
      newValues: validated.data,
      changes: `Created ${validated.data.type} category: ${newCategory.name}`
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/category`);
    return { success: true, data: newCategory };
  } catch (error) {
    console.error("Create category error:", error);
    return { error: { message: "Failed to create category. Please try again." } };
  }
}

export async function updateCategory(
  id: string,
  values: { name: string; shortName: string; type: Type }
) {
  const context = await getCachedSiteContext();
  const { siteId, userId, username, role } = context;

  const validated = categorySchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.flatten() };
  }

  try {
    const existingCategory = await verifyCategoryOwnership(id, siteId);

    if (existingCategory.type !== validated.data.type) {
      const [usedInServices, usedInProducts, usedInEmployees] = await Promise.all([
        db.service.count({ where: { categoryId: id, siteId } }),
        db.product.count({ where: { categoryId: id, siteId } }),
        db.employee.count({ where: { categoryId: id, siteId } })
      ]);

      const totalUsage = usedInServices + usedInProducts + usedInEmployees;

      if (totalUsage > 0) {
        const usageDetails = [];
        if (usedInServices > 0) usageDetails.push(`${usedInServices} service(s)`);
        if (usedInProducts > 0) usageDetails.push(`${usedInProducts} product(s)`);
        if (usedInEmployees > 0) usageDetails.push(`${usedInEmployees} employee(s)`);
        
        return { 
          error: { 
            message: `Cannot change category type. This category is currently used in ${usageDetails.join(", ")}. Please remove all associations first.` 
          } 
        };
      }
    }

    const [existingByName, existingByShortName] = await Promise.all([
      db.category.findFirst({
        where: { name: validated.data.name, siteId, type: validated.data.type, NOT: { id } },
      }),
      db.category.findFirst({
        where: { shortName: validated.data.shortName, siteId, type: validated.data.type, NOT: { id } },
      })
    ]);

    if (existingByName) {
      return { error: { message: `Another ${validated.data.type} category with this name already exists in your site.` } };
    }

    if (existingByShortName) {
      return { error: { message: `Another ${validated.data.type} category with this short name already exists in your site.` } };
    }

    const updatedCategory = await db.category.update({
      where: { id },
      data: {
        name: validated.data.name,
        shortName: validated.data.shortName,
        type: validated.data.type
      },
    });

    const oldValues = {
      name: existingCategory.name,
      shortName: existingCategory.shortName,
      type: existingCategory.type
    };
    
    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.UPDATE,
      entityType: "Category",
      entityId: updatedCategory.id,
      entityName: updatedCategory.name,
      oldValues,
      newValues: validated.data,
      changes: generateChangeSummary(oldValues, validated.data)
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/category`);
    return { success: true, data: updatedCategory };
  } catch (error: unknown) {
    console.error("Update category error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "Category not found or unauthorized access") {
      return { error: { message: errorMessage } };
    }
    return { error: { message: "Failed to update category. Please try again." } };
  }
}

export async function deleteCategory(id: string) {
  const context = await getCachedSiteContext();
  const { siteId, userId, username, role } = context;

  try {
    const category = await verifyCategoryOwnership(id, siteId);

    const [isUsedInService, isUsedInProduct, isUsedInEmployee] = await Promise.all([
      db.service.findFirst({ where: { categoryId: id, siteId } }),
      db.product.findFirst({ where: { categoryId: id, siteId } }),
      db.employee.findFirst({ where: { categoryId: id, siteId } })
    ]);
    
    if (isUsedInService) {
      return { error: { message: "This category is used in services and cannot be deleted." } };
    }

    if (isUsedInProduct) {
      return { error: { message: "This category is used in products and cannot be deleted." } };
    }

    if (isUsedInEmployee) {
      return { error: { message: "This category is used in employee records and cannot be deleted." } };
    }

    await db.category.delete({ where: { id } });

    await createAuditLog({
      siteId,
      userId,
      userName: username,
      userRole: role,
      action: AuditAction.DELETE,
      entityType: "Category",
      entityId: id,
      entityName: category.name,
      oldValues: {
        name: category.name,
        shortName: category.shortName,
        type: category.type
      },
      changes: `Deleted category: ${category.name}`
    });

    revalidatePath(`/new-auth/site/${siteId}/miscellaneous/category`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete category error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "Category not found or unauthorized access") {
      return { error: { message: errorMessage } };
    }
    return { error: { message: "Failed to delete category. Please try again." } };
  }
}

export async function getAllCategories() {
  const { siteId } = await getCachedSiteContext();

  try {
    const categories = await db.category.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            services: true,
            employees: true,
            products: true
          }
        },
      },
    });

    return categories;
  } catch (error) {
    console.error("Get categories error:", error);
    throw new Error("Failed to fetch categories");
  }
}

export async function getCategoryById(id: string) {
  const { siteId } = await getCachedSiteContext();

  try {
    const category = await db.category.findFirst({
      where: { id, siteId },
      include: {
        _count: {
          select: {
            services: true,
            employees: true,
            products: true
          }
        },
      },
    });

    if (!category) {
      throw new Error("Category not found or unauthorized access");
    }

    return category;
  } catch (error) {
    console.error("Get category error:", error);
    throw error;
  }
}

export async function getCategoriesByType(type: Type) { 
  const { siteId } = await getCachedSiteContext();

  try {
    const categories = await db.category.findMany({
      where: { 
        siteId,
        type
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true,
        type: true
      }
    });

    return categories;
  } catch (error) {
    console.error("Get categories by type error:", error);
    throw new Error("Failed to fetch categories");
  }
}