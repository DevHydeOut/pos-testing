// app/new-auth/admin/dashboard/page.tsx
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/new-auth/admin-dashboard-client";
import { db } from "@/lib/db";
import { auth } from "@/auth-new";
import { cache } from 'react';

// ✅ Cached function to prevent duplicate queries within same request
const getAdminData = cache(async (email: string) => {
  return db.mainUser.findUnique({
    where: { email },
    select: {
      email: true,
      name: true,
      companyCode: true,
      sites: {
        select: {
          id: true,
          name: true,
          siteId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { 
              sitePermissions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      subUsers: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          createdAt: true,
          sitePermissions: {
            select: {
              id: true,
              role: true,
              pagePermissions: true,
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
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
});

export default async function AdminDashboard() {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/new-auth/login");
  }

  // ✅ Use cached function - prevents duplicate queries
  const mainUser = await getAdminData(session.user.email);
  
  if (!mainUser) {
    redirect("/new-auth/login");
  }

  return (
    <AdminDashboardClient 
      initialSites={mainUser.sites}
      initialSubUsers={mainUser.subUsers}
      user={{
        email: mainUser.email,
        name: mainUser.name,
        companyCode: mainUser.companyCode,
      }}
    />
  );
}

// ✅ Force dynamic rendering to always get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;