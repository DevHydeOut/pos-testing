"use server";

import { auth } from "@/auth-new";
import { db } from "@/lib/db";

// Get all sales across all sites (Main Admin only)
export async function getAllSitesSales() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  
  try {
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email },
      include: {
        sites: {
          include: {
            sales: {
              include: {
                patient: true,
                items: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    // Aggregate sales from all sites
    const allSales = mainUser.sites.flatMap(site => 
      site.sales.map(sale => ({
        ...sale,
        siteName: site.name,
        siteId: site.siteId,
      }))
    );
    
    // Calculate totals
    const totalRevenue = allSales.reduce((sum, sale) => sum + sale.netAmount, 0);
    const totalSales = allSales.length;
    
    return {
      success: true,
      sales: allSales,
      stats: {
        totalRevenue,
        totalSales,
        siteCount: mainUser.sites.length,
      },
    };
    
  } catch (error) {
    console.error("Get all sales error:", error);
    return { error: "Failed to fetch sales" };
  }
}

// Get site-wise sales summary
export async function getSiteSalesSummary() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  
  try {
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email },
      include: {
        sites: {
          include: {
            _count: {
              select: {
                sales: true,
                appointments: true,
                products: true,
                patients: true,
              },
            },
            sales: {
              select: {
                netAmount: true,
              },
            },
          },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    const siteSummary = mainUser.sites.map(site => ({
      siteId: site.siteId,
      siteName: site.name,
      totalSales: site._count.sales,
      totalAppointments: site._count.appointments,
      totalProducts: site._count.products,
      totalPatients: site._count.patients,
      totalRevenue: site.sales.reduce((sum, sale) => sum + sale.netAmount, 0),
    }));
    
    return { success: true, siteSummary };
    
  } catch (error) {
    console.error("Get site summary error:", error);
    return { error: "Failed to fetch site summary" };
  }
}

// Get all appointments across sites
export async function getAllSitesAppointments(date?: Date) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  
  try {
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email },
      include: {
        sites: {
          include: {
            appointments: {
              where: date ? {
                slot: {
                  gte: new Date(date.setHours(0, 0, 0, 0)),
                  lte: new Date(date.setHours(23, 59, 59, 999)),
                },
              } : undefined,
              include: {
                patient: true,
                consultant: true,
                service: true,
              },
              orderBy: {
                slot: 'asc',
              },
            },
          },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    const allAppointments = mainUser.sites.flatMap(site => 
      site.appointments.map(apt => ({
        ...apt,
        siteName: site.name,
        siteId: site.siteId,
      }))
    );
    
    return { success: true, appointments: allAppointments };
    
  } catch (error) {
    console.error("Get all appointments error:", error);
    return { error: "Failed to fetch appointments" };
  }
}

// Get audit logs across all sites
export async function getAllSitesAuditLogs(limit = 100) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  
  try {
    const mainUser = await db.mainUser.findUnique({
      where: { email: session.user.email },
      include: {
        sites: {
          select: { id: true, name: true },
        },
      },
    });
    
    if (!mainUser) {
      return { error: "User not found" };
    }
    
    const siteIds = mainUser.sites.map(s => s.id);
    
    const auditLogs = await db.auditLog.findMany({
      where: {
        siteId: { in: siteIds },
      },
      include: {
        site: {
          select: {
            name: true,
            siteId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    return { success: true, auditLogs };
    
  } catch (error) {
    console.error("Get audit logs error:", error);
    return { error: "Failed to fetch audit logs" };
  }
}