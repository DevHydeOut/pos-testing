// components/new-auth/navbar/site-switcher.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { saveSelectedSite } from "@/actions/admin";

interface Site {
  id: string;
  siteId: string;
  name: string;
}

interface SiteSwitcherProps {
  sites: Site[];
  currentSiteName: string;
  currentSiteId?: string;
}

// Virtual dashboard site
const DASHBOARD_SITE = {
  id: "DASHBOARD",
  siteId: "DASHBOARD",
  name: "Dashboard",
  isVirtual: true,
};

export function SiteSwitcher({ sites, currentSiteName, currentSiteId }: SiteSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Combine virtual dashboard with actual sites
  const allSites = [DASHBOARD_SITE, ...(sites || [])];

const handleSiteSwitch = (selectedSiteId: string) => {
  if (!selectedSiteId || selectedSiteId === "undefined") {
    console.error("❌ Invalid siteId:", selectedSiteId);
    return;
  }

  startTransition(async () => {
    const result = await saveSelectedSite(selectedSiteId);

    if (result.error) {
      console.error("❌ Error saving site:", result.error);
      return;
    }

    if (selectedSiteId === "DASHBOARD") {
      router.push("/new-auth/admin/dashboard");
    } else {
      router.push(`/new-auth/site/${selectedSiteId}/billing`);
    }

    // ✅ Refresh AFTER navigation so the new page gets the updated session
    router.refresh();
    setOpen(false);
  });
};

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between h-9 text-sm"
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            {currentSiteId === "DASHBOARD" ? (
              <LayoutDashboard className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="truncate">{currentSiteName || "Select"}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start">
        <DropdownMenuLabel>Switch To</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {allSites && allSites.length > 0 ? (
            allSites.map((site) => (
              <DropdownMenuItem
                key={site.siteId}
                onClick={() => handleSiteSwitch(site.siteId)}
                className="cursor-pointer"
                disabled={isPending}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {site.siteId === "DASHBOARD" ? (
                      <LayoutDashboard className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{site.name}</span>
                  </div>
                  {site.siteId === currentSiteId && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              No sites available
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}