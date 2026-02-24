"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import UserMenu from "./user-menu";
import SubUserMenu from "../sub-user-menu";
import { SiteSwitcher } from "./site-switcher";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Building2 } from "lucide-react";

interface Site {
  id: string;
  siteId: string;
  name: string;
}

interface SubUserSession {
  currentSiteName?: string;
  currentSiteId?: string;
  [key: string]: unknown;
}

export default function Navbar() {
  const params = useParams();
  const pathname = usePathname();
  const siteId = params?.siteId as string;
  const mainUser = useCurrentUser();
  const [subUser, setSubUser] = React.useState<SubUserSession | null>(null);
  const [adminSites, setAdminSites] = React.useState<Site[]>([]);
  const [currentSiteName, setCurrentSiteName] = React.useState<string>("Dashboard");
  const [currentSiteId, setCurrentSiteId] = React.useState<string>("DASHBOARD");

  // Check for sub-user session - now using API
  React.useEffect(() => {
    const checkSubUserSession = async () => {
      try {
        const res = await fetch('/api/sub-user/session');
        if (res.ok) {
          const data = await res.json();
          setSubUser(data);
          setCurrentSiteName(data.currentSiteName || "");
          setCurrentSiteId(data.currentSiteId || "");
        } else {
          setSubUser(null);
        }
      } catch (error) {
        console.error("❌ Error fetching sub-user session:", error);
        setSubUser(null);
      }
    };

    checkSubUserSession();
    
    // Listen for session updates
    const handleSessionUpdate = () => checkSubUserSession();
    window.addEventListener("subUserSessionUpdated", handleSessionUpdate);

    return () => {
      window.removeEventListener("subUserSessionUpdated", handleSessionUpdate);
    };
  }, []);

  // Fetch admin sites
  React.useEffect(() => {
    const fetchAdminSites = async () => {
      if (mainUser?.email && !subUser) {
        try {
          const { getMySites } = await import("@/actions/new-auth");
          const result = await getMySites();

          if (result.sites && result.sites.length > 0) {
            setAdminSites(result.sites);

            // Determine current site name based on URL or route
            if (siteId && siteId !== "undefined" && siteId !== "DASHBOARD") {
              const currentSite = result.sites.find((s: Site) => s.siteId === siteId);
              if (currentSite) {
                setCurrentSiteName(currentSite.name);
                setCurrentSiteId(currentSite.siteId);
              }
            } else if (pathname.includes("/admin/dashboard")) {
              setCurrentSiteName("Dashboard");
              setCurrentSiteId("DASHBOARD");
            }
          }
        } catch (error) {
          console.error("Error fetching admin sites:", error);
        }
      }
    };

    fetchAdminSites();
  }, [mainUser, subUser, siteId, pathname]);

  const miscellaneous: { title: string; href: string; description: string }[] = [
    {
      title: "Category",
      href: `/new-auth/site/${siteId}/miscellaneous/category`,
      description: "Organize items by categories",
    },
    {
      title: "Product",
      href: `/new-auth/site/${siteId}/miscellaneous/product`,
      description: "Product catalog and inventory",
    },
    {
      title: "Tax System",
      href: `/new-auth/site/${siteId}/miscellaneous/tax-system`,
      description: "Manage tax configurations",
    },
  ];

  const isAdmin = mainUser && !subUser;
  const isDashboard = pathname.includes("/admin/dashboard");

  return (
    <div className="w-full px-4 pt-4 pb-2 flex justify-between items-center">
      <NavigationMenu viewport={false} className="">
        <NavigationMenuList>
          {/* Only show navigation if on a site page (not dashboard) */}
          {!isDashboard && siteId && siteId !== "DASHBOARD" && (
            <>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Sales</NavigationMenuTrigger>
                <NavigationMenuContent className="z-10">
                  <ul className="grid w-[300px] gap-4">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link href={`/new-auth/site/${siteId}/billing`}>
                          <div className="font-medium">Billing</div>
                          <div className="text-muted-foreground text-sm">
                            Process pharmacy billing.
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link href={`/new-auth/site/${siteId}/billing/stock`}>
                          <div className="font-medium">Stock</div>
                          <div className="text-muted-foreground text-sm">
                            Manage pharmacy inventory.
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink href={`/new-auth/site/${siteId}/courier`}>
                  Courier
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink href={`/new-auth/site/${siteId}/royalty-reward`}>
                  Royalty Reward
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Miscellaneous</NavigationMenuTrigger>
                <NavigationMenuContent className="z-10">
                  <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {miscellaneous.map((item) => (
                      <ListItem key={item.title} title={item.title} href={item.href}>
                        {item.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </>
          )}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex items-center gap-3">
        {/* Site Switcher for Admin - includes virtual Dashboard */}
        {isAdmin && adminSites.length > 0 && (
          <SiteSwitcher
            sites={adminSites}
            currentSiteName={currentSiteName}
            currentSiteId={currentSiteId}
          />
        )}

        {/* Current Site Name for Staff */}
        {subUser && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-md border text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{currentSiteName}</span>
          </div>
        )}

        {/* User Menu */}
        {subUser ? (
          <SubUserMenu key={subUser.currentSiteId} />
        ) : mainUser ? (
          <UserMenu />
        ) : null}
      </div>
    </div>
  );
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}