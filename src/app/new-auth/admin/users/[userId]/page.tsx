// app/new-auth/admin/users/[userId]/page.tsx
import { auth } from '@/auth-new';
import { redirect } from 'next/navigation';
import { getUserSitePermissions } from '@/actions/new-auth';
import { getMySites } from '@/actions/new-auth';
import { UserManagementClient } from '@/components/new-auth/user-management-client';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserManagementPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/new-auth/login');
  }

  // IMPORTANT: Await params first
  const resolvedParams = await params;

  const [userResult, sitesResult] = await Promise.all([
    getUserSitePermissions(resolvedParams.userId),
    getMySites(),
  ]);

  if (userResult.error || !userResult.user) {
    redirect('/new-auth/admin/dashboard');
  }

  if (sitesResult.error || !sitesResult.sites) {
    redirect('/new-auth/admin/dashboard');
  }

  return (
    <UserManagementClient
      user={userResult.user}
      availableSites={sitesResult.sites}
    />
  );
}