// app/new-auth/admin/sites/[siteId]/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth-new";
import { getSubUsers } from "@/actions/new-auth";
import { SiteManagementClient } from "@/components/new-auth/site-management-client";

interface PageProps {
  params: Promise<{
    siteId: string;
  }>;
}

export default async function SiteManagementPage({ params }: PageProps) {
  const { siteId } = await params;
  
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/new-auth/login");
  }

  const result = await getSubUsers(siteId);
  
  if (result.error || !result.site) {
    redirect("/new-auth/admin/dashboard");
  }

  return (
    <SiteManagementClient 
      site={result.site} 
      subUsers={result.subUsers || []} 
    />
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;