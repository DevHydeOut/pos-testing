// middleware.ts - EC2 OPTIMIZED
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth-new";
import { getFirstAccessiblePage, checkPathPermission } from "@/lib/permissions";

// Type for available sites in session
interface AvailableSite {
  siteId: string;
  siteName?: string;
}

// Type for session data structure
interface SubUserSession {
  companyCode?: string;
  mainUserId?: string;
  username?: string;
  currentSiteId?: string;
  permissions?: Record<string, string[]>;
  availableSites?: AvailableSite[];
}

/**
 * Helper: redirect only if the destination is different from the current path.
 * Prevents infinite redirect loops when the fallback page is the same as the
 * page that failed the permission check.
 */
function safeRedirect(request: NextRequest, destination: string): NextResponse {
  const currentPath = request.nextUrl.pathname;
  if (destination === currentPath) {
    // Already on the target page — just let the request through
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(destination, request.url));
}

/**
 * ✅ EC2-Optimized Middleware
 * On EC2: No cold starts, persistent Node.js process
 * Middleware runs fast (1-5ms) for every request
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ✅ Skip static assets (performance optimization)
  if (
    path.startsWith('/_next/static') ||
    path.startsWith('/_next/image') ||
    path.includes('/favicon') ||
    /\.(jpg|jpeg|png|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/.test(path)
  ) {
    return NextResponse.next();
  }

  // ✅ Optional: Performance logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Middleware:", path);
  }

  // ============================================
  // 1. ADMIN LOGIN PAGE
  // ============================================
  if (path === "/new-auth/login") {
    const session = await auth();
    if (session?.user?.email) {
      return NextResponse.redirect(new URL("/new-auth/admin/redirect", request.url));
    }
    return NextResponse.next();
  }

  // ============================================
  // 2. STAFF LOGIN PAGE
  // ============================================
  if (path === "/new-auth/staff-login") {
    const sessionCookie = request.cookies.get("subUserSession");
    
    if (sessionCookie) {
      try {
        const session: SubUserSession = JSON.parse(sessionCookie.value);
        
        if (session?.currentSiteId && session?.companyCode) {
          const redirectPath = getFirstAccessiblePage(
            session.permissions,
            session.currentSiteId
          );
          // ✅ Guard: avoid redirecting back to staff-login itself
          if (redirectPath !== path) {
            return NextResponse.redirect(new URL(redirectPath, request.url));
          }
        }
      } catch {
        // Invalid session, clear cookie
        const response = NextResponse.next();
        response.cookies.delete("subUserSession");
        return response;
      }
    }
    return NextResponse.next();
  }

  // ============================================
  // 3. SITE ROUTES (Admin + Staff Access)
  // ============================================
  const siteRouteMatch = path.match(/^\/new-auth\/site\/([^\/]+)(\/.*)?$/);
  
  if (siteRouteMatch) {
    const siteId = siteRouteMatch[1];
    const subPath = siteRouteMatch[2] || '';
    
    // ✅ Check ADMIN session first
    const adminSession = await auth();
    if (adminSession?.user?.email) {
      // Admin has full access
      // getSiteContext() will verify site ownership when page loads
      return NextResponse.next();
    }
    
    // ✅ Check STAFF session (cookie-based, no DB calls)
    const sessionCookie = request.cookies.get("subUserSession");
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/new-auth/staff-login", request.url));
    }

    try {
      const session: SubUserSession = JSON.parse(sessionCookie.value);
      
      // Validate required session fields
      if (!session.companyCode || !session.mainUserId || !session.username) {
        const response = NextResponse.redirect(new URL("/new-auth/staff-login", request.url));
        response.cookies.delete("subUserSession");
        return response;
      }
      
      // Check site access (from session data, no DB call)
      const hasAccess = session.availableSites?.some(
        (site: AvailableSite) => site.siteId === siteId
      );

      if (!hasAccess) {
        // ✅ FIXED: Use safeRedirect to prevent loop if fallback == current path
        const redirectPath = getFirstAccessiblePage(
          session.permissions,
          session.currentSiteId || siteId
        );
        return safeRedirect(request, redirectPath);
      }

      // ✅ FIXED: Check page permissions only when there is a meaningful subPath.
      // Previously, subPath like "/billing" was non-empty and triggered the check,
      // but if the permission check failed it would redirect to "/billing" again → loop.
      //
      // Now we also guard with safeRedirect so we never redirect to the same path.
      if (session.permissions && subPath && subPath !== '' && subPath !== '/') {
        const hasPageAccess = checkPathPermission(
          session.permissions,
          path,
          siteId
        );
        
        if (!hasPageAccess) {
          const redirectPath = getFirstAccessiblePage(
            session.permissions,
            siteId
          );
          // ✅ FIXED: Only redirect if destination differs from current path
          return safeRedirect(request, redirectPath);
        }
      }

      return NextResponse.next();
      
    } catch (error) {
      console.error("Middleware session error:", error);
      const response = NextResponse.redirect(new URL("/new-auth/staff-login", request.url));
      response.cookies.delete("subUserSession");
      return response;
    }
  }

  // ============================================
  // 4. ADMIN-ONLY ROUTES
  // ============================================
  if (path.startsWith("/new-auth/admin")) {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.redirect(new URL("/new-auth/login", request.url));
    }
    
    return NextResponse.next();
  }

  // ============================================
  // 5. DEFAULT: Allow through
  // ============================================
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf)$).*)',
    '/new-auth/:path*',
  ],
};