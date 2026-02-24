// actions/new-auth.ts
"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {  
  CreateSubUserSchema, 
  CreateSiteSchema,
  UpdateSubUserSchema,
} from "@/schemas/new-auth";
import { auth } from "@/auth-new";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// ✅ OPTIMIZATION: Cache helper for auth session
async function getCachedAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  return session;
}

// Type definitions
interface AvailableSite {
  siteId: string;
  siteName: string;
  role: string;
  permissions: Record<string, string[]> | null;
}

// ============================================
// SUB-USER LOGIN
// ============================================

export async function loginSubUser(values: {
  companyCode: string;
  username: string;
  password: string;
}) {
  try {
    // ✅ OPTIMIZATION: Fetch main user with sub-user in single query
    const mainUser = await db.mainUser.findUnique({
      where: { companyCode: values.companyCode.toUpperCase() },
      select: {
        id: true,
        subUsers: {
          where: {
            username: values.username.toLowerCase(),
          },
          include: {
            sitePermissions: {
              include: { site: true },
            },
          },
          take: 1,
        },
      },
    });

    if (!mainUser) {
      return { error: "Invalid company code" };
    }

    const subUser = mainUser.subUsers[0];
    
    if (!subUser) {
      return { error: "Invalid username or password" };
    }

    const isPasswordValid = await bcrypt.compare(values.password, subUser.password);

    if (!isPasswordValid) {
      return { error: "Invalid username or password" };
    }

    if (!subUser.sitePermissions || subUser.sitePermissions.length === 0) {
      return { error: "No site access granted. Contact your administrator." };
    }

    const firstPermission = subUser.sitePermissions[0];
    const currentSite = firstPermission.site;

    const sessionData = {
      id: subUser.id,
      username: subUser.username,
      name: subUser.name,
      email: subUser.email,
      companyCode: values.companyCode.toUpperCase(),
      mainUserId: mainUser.id,
      currentSiteId: currentSite.siteId,
      currentSiteName: currentSite.name,
      currentSiteRole: firstPermission.role,
      permissions: firstPermission.pagePermissions as Record<string, string[]> | null,
      availableSites: subUser.sitePermissions.map((perm) => ({
        siteId: perm.site.siteId,
        siteName: perm.site.name,
        role: perm.role,
        permissions: perm.pagePermissions as Record<string, string[]> | null,
      })),
    };

    const cookieStore = await cookies();
    cookieStore.set("subUserSession", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return {
      success: "Login successful",
      user: sessionData,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An error occurred during login" };
  }
}

// ============================================
// SWITCH SITE
// ============================================

export const switchSite = async (siteId: string) => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('subUserSession');
    
    if (!sessionCookie) {
      return { error: "Not authenticated" };
    }
    
    const currentSession = JSON.parse(sessionCookie.value);
    const targetSite = currentSession.availableSites.find((s: AvailableSite) => s.siteId === siteId);
    
    if (!targetSite) {
      return { error: "You don't have access to this site" };
    }
    
    const sitePermission = await db.sitePermission.findFirst({
      where: {
        subUserId: currentSession.id,
        site: { siteId: targetSite.siteId },
      },
      include: { site: true },
    });
    
    if (!sitePermission) {
      return { error: "Site access not found" };
    }
    
    const updatedSession = {
      ...currentSession,
      currentSiteId: sitePermission.site.siteId,
      currentSiteName: sitePermission.site.name,
      currentSiteRole: sitePermission.role,
      permissions: sitePermission.pagePermissions as Record<string, string[]> | null,
    };
    
    cookieStore.set('subUserSession', JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    
    return {
      success: "Site switched successfully",
      site: {
        siteId: sitePermission.site.siteId,
        name: sitePermission.site.name,
      },
    };
    
  } catch (error) {
    console.error("Switch site error:", error);
    return { error: "Failed to switch site" };
  }
};

// ============================================
// SITE MANAGEMENT
// ============================================

export const createSite = async (values: z.infer<typeof CreateSiteSchema>) => {
  try {
    const session = await getCachedAuth();
    
    const validatedFields = CreateSiteSchema.safeParse(values);
    
    if (!validatedFields.success) {
      return { error: "Invalid fields" };
    }
    
    const { name } = validatedFields.data;
    
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    const { randomUUID } = await import("crypto");
    const siteId = randomUUID();
    
    const site = await db.mainSite.create({
      data: {
        name,
        siteId,
        mainUserId: mainUser.id,
      },
    });
    
    revalidatePath("/new-auth/admin/dashboard");
    
    return { 
      success: "Site created successfully",
      site: {
        id: site.id,
        name: site.name,
        siteId: site.siteId,
      }
    };
    
  } catch (error) {
    console.error("Create site error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to create site" };
  }
};

export const getMySites = async () => {
  try {
    const session = await getCachedAuth();
    
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email! },
      select: {
        sites: {
          include: {
            _count: {
              select: { sitePermissions: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    return { sites: mainUser.sites };
    
  } catch (error) {
    console.error("Get sites error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to fetch sites" };
  }
};

export const updateSite = async (
  siteId: string,
  values: { name: string; siteId: string }
) => {
  try {
    const session = await getCachedAuth();
    
    // ✅ OPTIMIZATION: Check ownership and duplicate in parallel
    const [site, existingSite] = await Promise.all([
      db.mainSite.findFirst({
        where: {
          id: siteId,
          mainUser: { email: session.user.email! },
        },
      }),
      values.siteId ? db.mainSite.findUnique({
        where: { siteId: values.siteId },
        select: { id: true },
      }) : Promise.resolve(null),
    ]);
    
    if (!site) {
      return { error: "Site not found or unauthorized" };
    }
    
    if (existingSite && existingSite.id !== siteId) {
      return { error: "Site ID already exists" };
    }
    
    await db.mainSite.update({
      where: { id: siteId },
      data: {
        name: values.name,
        siteId: values.siteId,
      },
    });
    
    revalidatePath("/new-auth/admin/dashboard");
    revalidatePath(`/new-auth/admin/sites/${siteId}`);
    
    return { success: "Site updated successfully" };
    
  } catch (error) {
    console.error("Update site error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to update site" };
  }
};

export const deleteSite = async (siteId: string) => {
  try {
    const session = await getCachedAuth();
    
    const site = await db.mainSite.findFirst({
      where: {
        id: siteId,
        mainUser: { email: session.user.email! },
      },
      select: {
        id: true,
        _count: {
          select: {
            sitePermissions: true,
            categories: true,
            services: true,
            employees: true,
            products: true,
            patients: true,
            appointments: true,
            sales: true,
          },
        },
      },
    });
    
    if (!site) {
      return { error: "Site not found or unauthorized" };
    }
    
    const totalRecords = Object.values(site._count).reduce((a: number, b: number) => a + b, 0);
    
    if (totalRecords > 0) {
      return { 
        error: `Cannot delete site. It contains ${totalRecords} records. Please delete all data first.` 
      };
    }
    
    await db.mainSite.delete({
      where: { id: siteId },
    });
    
    revalidatePath("/new-auth/admin/dashboard");
    
    return { success: "Site deleted successfully" };
    
  } catch (error) {
    console.error("Delete site error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to delete site" };
  }
};

// ============================================
// SUB-USER MANAGEMENT
// ============================================

export const createSubUser = async (values: z.infer<typeof CreateSubUserSchema>) => {
  try {
    const session = await getCachedAuth();
    
    const validatedFields = CreateSubUserSchema.safeParse(values);
    
    if (!validatedFields.success) {
      return { error: "Invalid fields" };
    }
    
    const { username, password, name, email } = validatedFields.data;
    
    // ✅ OPTIMIZATION: Get mainUser with check for existing username
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email! },
      select: { 
        id: true,
        subUsers: {
          where: { username },
          select: { id: true },
          take: 1,
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    if (mainUser.subUsers && mainUser.subUsers.length > 0) {
      return { error: "Username already exists in your organization" };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const subUser = await db.subUser.create({
      data: {
        username,
        password: hashedPassword,
        name: name || null,
        email: email || null,
        mainUserId: mainUser.id,
      },
    });
    
    revalidatePath("/new-auth/admin/dashboard");
    revalidatePath("/new-auth/admin/users");
    
    return { 
      success: "User created successfully",
      user: {
        id: subUser.id,
        username: subUser.username,
        name: subUser.name,
      }
    };
    
  } catch (error) {
    console.error("Create sub-user error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to create user" };
  }
};

export const getAllSubUsers = async () => {
  try {
    const session = await getCachedAuth();
    
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email! },
      select: {
        subUsers: {
          include: {
            sitePermissions: {
              include: {
                site: {
                  select: {
                    id: true,
                    name: true,
                    siteId: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    return { subUsers: mainUser.subUsers };
    
  } catch (error) {
    console.error("Get sub-users error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to fetch users" };
  }
};

export const updateSubUser = async (
  userId: string,
  values: z.infer<typeof UpdateSubUserSchema>
) => {
  try {
    const session = await getCachedAuth();
    
    const subUser = await db.subUser.findUnique({
      where: { id: userId },
      include: { mainUser: true },
    });
    
    if (!subUser || subUser.mainUser.email !== session.user.email) {
      return { error: "Unauthorized" };
    }
    
    const updateData: {
      name?: string;
      email?: string | null;
      password?: string;
    } = {};
    
    if (values.name) updateData.name = values.name;
    if (values.email !== undefined) updateData.email = values.email || null;
    if (values.password) {
      updateData.password = await bcrypt.hash(values.password, 10);
    }
    
    await db.subUser.update({
      where: { id: userId },
      data: updateData,
    });
    
    revalidatePath("/new-auth/admin/users");
    
    return { success: "User updated successfully" };
    
  } catch (error) {
    console.error("Update user error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to update user" };
  }
};

export const deleteSubUser = async (userId: string) => {
  try {
    const session = await getCachedAuth();
    
    const subUser = await db.subUser.findUnique({
      where: { id: userId },
      include: { mainUser: true },
    });
    
    if (!subUser || subUser.mainUser.email !== session.user.email) {
      return { error: "Unauthorized" };
    }
    
    await db.subUser.delete({
      where: { id: userId },
    });
    
    revalidatePath("/new-auth/admin/users");
    
    return { success: "User deleted successfully" };
    
  } catch (error) {
    console.error("Delete user error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to delete user" };
  }
};

// ============================================
// SITE-SPECIFIC USER MANAGEMENT
// ============================================

interface SitePermissionWithUser {
  id: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";  
  pagePermissions: unknown;
  createdAt: Date;
  subUser: {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
    createdAt: Date;
  };
}

export const getSubUsers = async (siteId: string) => {
  try {
    const session = await getCachedAuth();
    
    const site = await db.mainSite.findFirst({
      where: {
        id: siteId,
        mainUser: { email: session.user.email! },
      },
      select: {
        id: true,
        name: true,
        siteId: true,
        sitePermissions: {
          include: {
            subUser: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!site) {
      return { error: "Site not found or unauthorized" };
    }
    
    const users = site.sitePermissions.map((permission: SitePermissionWithUser) => ({
      id: permission.subUser.id,
      username: permission.subUser.username,
      name: permission.subUser.name,
      email: permission.subUser.email,
      role: permission.role as "ADMIN" | "EDITOR" | "VIEWER",  // ← add this cast
      permissionId: permission.id,
      createdAt: permission.subUser.createdAt,
      pagePermissions: permission.pagePermissions as Record<string, string[]>,
    }));
    
    return { 
      subUsers: users,
      site: {
        id: site.id,
        name: site.name,
        siteId: site.siteId,
      }
    };
    
  } catch (error) {
    console.error("Get sub-users error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to fetch users" };
  }
};

// ============================================
// SITE PERMISSION MANAGEMENT
// ============================================

export async function assignSiteToUser(
  userId: string,
  data: {
    siteId: string;
    pagePermissions: Record<string, string[]>;
  }
) {
  try {
    const hasPages = Object.values(data.pagePermissions).some(
      pages => pages.length > 0
    );

    if (!hasPages) {
      return { error: "Please select at least one page permission" };
    }

    const permission = await db.sitePermission.upsert({
      where: {
        subUserId_siteId: {
          subUserId: userId,
          siteId: data.siteId,
        },
      },
      update: {
        pagePermissions: data.pagePermissions,
      },
      create: {
        subUserId: userId,
        siteId: data.siteId,
        role: 'VIEWER',
        pagePermissions: data.pagePermissions,
      },
      include: {
        site: true,
        subUser: true,
      },
    });

    revalidatePath("/new-auth/admin/dashboard");
    revalidatePath("/new-auth/admin/users");

    return { success: true, permission };
  } catch (error) {
    console.error("Error assigning site:", error);
    return { error: "Failed to assign site" };
  }
}

export const removeSiteFromUser = async (userId: string, siteId: string) => {
  try {
    const session = await getCachedAuth();
    
    const subUser = await db.subUser.findUnique({
      where: { id: userId },
      include: { mainUser: true },
    });
    
    if (!subUser || subUser.mainUser.email !== session.user.email) {
      return { error: "Unauthorized" };
    }
    
    await db.sitePermission.delete({
      where: {
        subUserId_siteId: {
          subUserId: userId,
          siteId: siteId,
        },
      },
    });
    
    revalidatePath("/new-auth/admin/users");
    
    return { success: "Site access removed successfully" };
    
  } catch (error) {
    console.error("Remove site error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to remove site access" };
  }
};

export const getUserSitePermissions = async (userId: string) => {
  try {
    const session = await getCachedAuth();
    
    const subUser = await db.subUser.findUnique({
      where: { id: userId },
      include: {
        mainUser: true,
        sitePermissions: {
          include: {
            site: {
              select: {
                id: true,
                name: true,
                siteId: true,
              },
            },
          },
        },
      },
    });
    
    if (!subUser || subUser.mainUser.email !== session.user.email) {
      return { error: "Unauthorized" };
    }
    
    return { 
      user: {
        id: subUser.id,
        username: subUser.username,
        name: subUser.name,
        email: subUser.email,
        sitePermissions: subUser.sitePermissions.map(p => ({
          id: p.id,
          role: p.role,
          site: p.site,
          pagePermissions: p.pagePermissions as Record<string, string[]> || {},
        })),
      },
    };
    
  } catch (error) {
    console.error("Get permissions error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to fetch permissions" };
  }
};

export async function updateSitePermission(
  userId: string,
  siteId: string,
  data: {
    pagePermissions?: Record<string, string[]>;
  }
) {
  try {
    const permission = await db.sitePermission.update({
      where: {
        subUserId_siteId: {
          subUserId: userId,
          siteId,
        },
      },
      data: {
        ...(data.pagePermissions && { pagePermissions: data.pagePermissions }),
      },
      include: {
        site: true,
        subUser: true,
      },
    });

    revalidatePath("/new-auth/admin/dashboard");
    revalidatePath("/new-auth/admin/users");

    return { success: true, permission };
  } catch (error) {
    console.error("Error updating permission:", error);
    return { error: "Failed to update permission" };
  }
}

export async function handleSignOut() {
  const { signOut } = await import("@/auth-new");
  await signOut();
}