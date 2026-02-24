"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  LogOutIcon,
  Building2,
  Shield,
  Key,
  Eye,
  RefreshCw,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { switchSite } from "@/actions/new-auth";
import { getFirstAccessiblePage } from "@/lib/permissions";

interface SubUserSession {
  id: string;
  username: string;
  name: string | null;
  currentSiteId: string;
  currentSiteName: string;
  currentSiteRole: string;
  permissions: Record<string, string[]> | null;
  availableSites?: Array<{
    siteId: string;
    siteName: string;
    role: string;
    permissions: Record<string, string[]> | null;
  }>;
}

const SubUserMenu = () => {
  const router = useRouter();
  const [user, setUser] = useState<SubUserSession | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [switchingSite, setSwitchingSite] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/sub-user/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/sub-user/logout", { method: "POST" });
      router.push("/new-auth/staff-login");
      router.refresh();
    } catch {
      router.push("/new-auth/staff-login");
    }
  };

  const handleSwitchSite = async (siteId: string) => {
    if (siteId === user?.currentSiteId || switchingSite) return;

    setError(null);
    setSwitchingSite(siteId);

    startTransition(async () => {
      try {
        // ✅ Step 1: Write the new cookie on the server FIRST
        const result = await switchSite(siteId);

        if (result.error) {
          setError(result.error);
          setSwitchingSite(null);
          return;
        }

        // ✅ Step 2: Update local UI state from the confirmed server response
        // FIX: destructure result.site into a local const so TypeScript narrows it
        // as non-undefined inside the nested setUser callback (TS18048)
        if (result.success && result.site && user?.availableSites) {
          const switchedSite = result.site;
          const targetSite = user.availableSites.find((s) => s.siteId === siteId);
          if (targetSite) {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    currentSiteId:   switchedSite.siteId,
                    currentSiteName: switchedSite.name,
                    currentSiteRole: targetSite.role,
                    permissions:     targetSite.permissions,
                  }
                : prev
            );
          }
        }

        // ✅ Step 3: Notify navbar to re-fetch session
        window.dispatchEvent(new Event("subUserSessionUpdated"));

        // ✅ Step 4: Navigate to the first page the user has permission for
        // Falls back to /billing if no permissions config
        const targetPermissions =
          user?.availableSites?.find((s) => s.siteId === siteId)?.permissions ?? null;

        const landingPath = targetPermissions
          ? getFirstAccessiblePage(targetPermissions, result.site!.siteId)
          : `/new-auth/site/${result.site!.siteId}/billing`;

        router.push(landingPath);

        // ✅ Step 5: Refresh so server components re-read the new cookie
        router.refresh();

        setSwitchingSite(null);
      } catch {
        setError("Failed to switch site. Please try again.");
        setSwitchingSite(null);
        await fetchSession(); // revert UI to real server state
      }
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":   return <Shield  className="h-3 w-3" />;
      case "EDITOR":  return <Key     className="h-3 w-3" />;
      case "VIEWER":  return <Eye     className="h-3 w-3" />;
      default:        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":  return "bg-red-100 text-red-700 border-red-200";
      case "EDITOR": return "bg-blue-100 text-blue-700 border-blue-200";
      case "VIEWER": return "bg-slate-100 text-slate-700 border-slate-200";
      default:       return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <Avatar className="h-9 w-9 ring-2 ring-slate-200">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" />
        </AvatarFallback>
      </Avatar>
    );
  }

  const initials =
    user.name?.charAt(0)?.toUpperCase() ||
    user.username?.charAt(0)?.toUpperCase() ||
    "U";

  const hasMultipleSites = user.availableSites && user.availableSites.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <Avatar className="h-9 w-9 ring-2 ring-slate-200 hover:ring-blue-400 transition-all">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 mr-4 mt-2" align="end">

        {/* User Info */}
        <div className="flex flex-col items-center py-3 px-2">
          <Avatar className="h-20 w-20 mb-3 ring-4 ring-slate-100">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <DropdownMenuLabel className="text-base font-semibold text-center mb-1">
            {user.name || "No Name"}
          </DropdownMenuLabel>
          <div className="text-sm text-muted-foreground mb-3">@{user.username}</div>
          <Badge className={`${getRoleBadgeColor(user.currentSiteRole)} border flex items-center gap-1.5 px-3 py-1`}>
            {getRoleIcon(user.currentSiteRole)}
            <span className="font-medium">{user.currentSiteRole}</span>
          </Badge>
        </div>

        <DropdownMenuSeparator />

        {/* Current Site */}
        <div className="px-3 py-2 bg-slate-50 rounded-md mx-2 my-2">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Current Site</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 ml-6">
            {user.currentSiteName}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 mx-2 my-1 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Site Switcher */}
        {hasMultipleSites && user.availableSites && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="py-2.5 cursor-pointer">
                {isPending || switchingSite ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                <span>Switch Site</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {user.availableSites.length}
                </Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {user.availableSites.map((site) => {
                  const isCurrentSite = site.siteId === user.currentSiteId;
                  const isSwitching   = switchingSite === site.siteId;

                  return (
                    <DropdownMenuItem
                      key={site.siteId}
                      onClick={() => handleSwitchSite(site.siteId)}
                      disabled={isPending || isCurrentSite || !!switchingSite}
                      className="cursor-pointer py-3 px-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {site.siteName}
                            {isCurrentSite && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {isSwitching   && <Loader2     className="h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                        </div>
                        <Badge variant="outline" className={`${getRoleBadgeColor(site.role)} text-xs ml-2`}>
                          {site.role}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="py-2.5 cursor-pointer gap-2"
          onClick={() => router.push(`/new-auth/site/${user.currentSiteId}/profile`)}
        >
          <Edit className="h-4 w-4" />
          Edit Profile
        </DropdownMenuItem>

        <DropdownMenuItem
          className="py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer gap-2 font-medium"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOutIcon className="h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Log Out"}
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SubUserMenu;