// actions/admin.ts
"use server";

import { currentRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { setAdminSelectedSite } from "@/lib/get-site-context";
import { auth } from "@/auth-new";
import { revalidatePath } from "next/cache";

export const admin = async () => {
  const role = await currentRole();
  if (role === UserRole.ADMIN) {
    return { success: "Allowed Server Action!" };
  }
  return { error: "Forbidden Server Action!" };
};

export async function saveSelectedSite(siteId: string) {
  try {
    // Verify admin is authenticated
    const session = await auth();

    if (!session?.user?.email) {
      return { error: "Unauthorized" };
    }

    if (!siteId || siteId === "undefined") {
      return { error: "Invalid siteId" };
    }

    // Save the site preference
    await setAdminSelectedSite(siteId);

    // Revalidate paths to refresh data
    revalidatePath("/new-auth/admin/dashboard");
    revalidatePath("/new-auth/site");

    return { success: true, siteId };
  } catch (error) {
    console.error("Error saving selected site:", error);
    return { error: "Failed to save site preference" };
  }
}