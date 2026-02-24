// lib/get-site-context.ts
"use server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/auth-new";
import { cache } from 'react'

interface SiteContext {
  siteId: string;
  siteSlug: string;
  siteName: string;
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  isAdmin: boolean;
  isVirtualSite: boolean;
  permissions: {
    canViewAnalytics: boolean;
    canManageInventory: boolean;
    canManageSales: boolean;
    canManagePatients: boolean;
    canManageEmployees: boolean;
  };
  allowedUrls: string[];
  restrictedUrls: string[];
}

export const getSiteContext = cache(async (requestedSiteSlug?: string): Promise<SiteContext> => {
  const adminSession = await auth();

  if (adminSession?.user?.email) {
    console.log("👑 Admin session detected:", adminSession.user.email);

    let siteSlug = requestedSiteSlug;

    if (!siteSlug) {
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") || headersList.get("referer") || "";
      const match = pathname.match(/\/new-auth\/site\/([^\/]+)/);
      if (match) {
        siteSlug = match[1];
        console.log("✅ Extracted siteId from URL:", siteSlug);
      }
    }

    if (!siteSlug) {
      const cookieStore = await cookies();
      const adminSiteCookie = cookieStore.get("adminSelectedSite");

      if (adminSiteCookie) {
        try {
          const siteData = JSON.parse(adminSiteCookie.value);
          siteSlug = siteData.siteId;
          console.log("✅ Got siteSlug from admin preference:", siteSlug);
        } catch {
          console.log("⚠️ Failed to parse admin site preference");
        }
      }
    }

    if (siteSlug === "DASHBOARD") {
      const mainUser = await db.mainUser.findUnique({
        where: { email: adminSession.user.email },
        select: { id: true },
      });

      if (!mainUser) {
        throw new Error("Admin user not found");
      }

      return {
        siteId: "DASHBOARD",
        siteSlug: "DASHBOARD",
        siteName: "Dashboard",
        id: mainUser.id,
        username: adminSession.user.email,
        name: adminSession.user.name || null,
        email: adminSession.user.email,
        role: "SUPER_ADMIN",
        isAdmin: true,
        isVirtualSite: true,
        permissions: {
          canViewAnalytics: true,
          canManageInventory: true,
          canManageSales: true,
          canManagePatients: true,
          canManageEmployees: true,
        },
        allowedUrls: ["*"],
        restrictedUrls: [],
      };
    }

    if (!siteSlug) {
      const [mainUser, firstSite] = await Promise.all([
        db.mainUser.findUnique({
          where: { email: adminSession.user.email },
          select: { id: true },
        }),
        db.mainSite.findFirst({
          where: {
            mainUser: { email: adminSession.user.email }
          },
          orderBy: { createdAt: "asc" },
          select: { siteId: true },
        })
      ]);

      if (!mainUser) {
        throw new Error("Admin user not found");
      }

      if (firstSite) {
        siteSlug = firstSite.siteId;
        console.log("✅ Using first (default) site:", siteSlug);
      } else {
        return {
          siteId: "DASHBOARD",
          siteSlug: "DASHBOARD",
          siteName: "Dashboard",
          id: mainUser.id,
          username: adminSession.user.email,
          name: adminSession.user.name || null,
          email: adminSession.user.email,
          role: "SUPER_ADMIN",
          isAdmin: true,
          isVirtualSite: true,
          permissions: {
            canViewAnalytics: true,
            canManageInventory: true,
            canManageSales: true,
            canManagePatients: true,
            canManageEmployees: true,
          },
          allowedUrls: ["*"],
          restrictedUrls: [],
        };
      }
    }

    const site = await db.mainSite.findFirst({
      where: { 
        OR: [
          { id: siteSlug },
          { siteId: siteSlug }
        ],
        mainUser: { email: adminSession.user.email }
      },
      select: {
        id: true,
        name: true,
        siteId: true,
        mainUserId: true,
        mainUser: {
          select: { id: true }
        }
      },
    });

    if (!site) {
      throw new Error(`Site not found or access denied: ${siteSlug}`);
    }

    return {
      siteId: site.id,
      siteSlug: site.siteId,
      siteName: site.name,
      id: site.mainUser.id,
      username: adminSession.user.email,
      name: adminSession.user.name || null,
      email: adminSession.user.email,
      role: "SUPER_ADMIN",
      isAdmin: true,
      isVirtualSite: false,
      permissions: {
        canViewAnalytics: true,
        canManageInventory: true,
        canManageSales: true,
        canManagePatients: true,
        canManageEmployees: true,
      },
      allowedUrls: ["*"],
      restrictedUrls: [],
    };
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("subUserSession");

  if (!sessionCookie) {
    throw new Error("Not authenticated. Please log in.");
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);

    const siteSlug = requestedSiteSlug || sessionData.currentSiteId || sessionData.siteId;

    if (!siteSlug) {
      throw new Error("No site ID in session");
    }

    const site = await db.mainSite.findFirst({
      where: {
        OR: [
          { id: siteSlug },
          { siteId: siteSlug }
        ]
      },
      select: {
        id: true,
        name: true,
        siteId: true,
      },
    });

    if (!site) {
      throw new Error(`Site not found: ${siteSlug}`);
    }

    if (!sessionData.id || !sessionData.username) {
      throw new Error("Invalid session data. Please log in again.");
    }

    const role = sessionData.currentSiteRole || sessionData.role || "VIEWER";

    return {
      siteId: site.id,
      siteSlug: site.siteId,
      siteName: site.name,
      id: sessionData.id,
      username: sessionData.username,
      name: sessionData.name || null,
      email: sessionData.email || null,
      role,
      isAdmin: false,
      isVirtualSite: false,
      permissions: sessionData.permissions || {
        canViewAnalytics: false,
        canManageInventory: false,
        canManageSales: false,
        canManagePatients: false,
        canManageEmployees: false,
      },
      allowedUrls: sessionData.allowedUrls || [],
      restrictedUrls: sessionData.restrictedUrls || [],
    };
  } catch (error) {
    console.error("Error getting site context:", error);
    throw new Error("Invalid session. Please log in again.");
  }
})

export async function getSiteContextFromParams(siteId?: string): Promise<SiteContext> {
  if (!siteId) {
    throw new Error("siteId is required for getSiteContextFromParams()");
  }
  return getSiteContext(siteId);
}

export async function setAdminSelectedSite(siteId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("adminSelectedSite", JSON.stringify({ siteId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getAdminSelectedSite(): Promise<string | null> {
  const cookieStore = await cookies();
  const adminSiteCookie = cookieStore.get("adminSelectedSite");

  if (!adminSiteCookie) {
    return null;
  }

  try {
    const siteData = JSON.parse(adminSiteCookie.value);
    return siteData.siteId;
  } catch {
    return null;
  }
}

export const isAdmin = cache(async (): Promise<boolean> => {
  try {
    const adminSession = await auth();
    return !!adminSession?.user?.email;
  } catch {
    return false;
  }
});

export const getAccessibleSites = cache(async (): Promise<Array<{
  id: string;
  siteId: string;
  name: string;
}>> => {
  const adminSession = await auth();
  
  if (adminSession?.user?.email) {
    const sites = await db.mainSite.findMany({
      where: {
        mainUser: {
          email: adminSession.user.email,
        },
      },
      select: {
        id: true,
        siteId: true,
        name: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return sites;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("subUserSession");

  if (!sessionCookie) {
    return [];
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);
    return sessionData.availableSites || [];
  } catch {
    return [];
  }
});

export async function getCurrentSiteId(siteId?: string): Promise<string> {
  const context = await getSiteContext(siteId);
  return context.siteId;
}

export async function getCurrentSiteSlug(siteId?: string): Promise<string> {
  const context = await getSiteContext(siteId);
  return context.siteSlug;
}