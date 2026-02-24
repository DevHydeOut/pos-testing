// app/new-auth/admin/redirect/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth-new";
import { db } from "@/lib/db";
import { cache } from 'react';

// ✅ Optimized query - only fetch the first site's siteId
const getFirstSite = cache(async (email: string) => {
  return db.mainSite.findFirst({
    where: {
      mainUser: { email }
    },
    select: { siteId: true },
    orderBy: { createdAt: 'asc' }
  });
});

export default async function AdminRedirectPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/new-auth/login");
  }
  
  // ✅ Optimized - single targeted query instead of fetching mainUser with includes
  const firstSite = await getFirstSite(session.user.email);
  
  if (firstSite) {
    // Redirect to first site's billing page
    redirect(`/new-auth/site/${firstSite.siteId}/billing`);
  }
  
  // No sites found - go to admin dashboard to create one
  redirect("/new-auth/admin/dashboard");
}

// ✅ Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;