export type ModuleKey = typeof MODULES[number]["key"];

export const MODULES = [
  {
    key: "sale" as const,
    label: "Sale",
    pages: [
      { 
        key: "billing", 
        label: "Billing", 
        path: "/new-auth/site/${siteId}/billing" 
      },
      { 
        key: "stock", 
        label: "Stock", 
        path: "/new-auth/site/${siteId}/billing/stock" 
      },
    ],
  },
  {
    key: "royalty-reward" as const,
    label: "Royalty Reward",
    pages: [
      { 
        key: "royalty-reward", 
        label: "Royalty Reward", 
        path: "/new-auth/site/${siteId}/royalty-reward"   
      },
    ],
  },
  {
    key: "miscellaneous" as const,
    label: "Miscellaneous",
    pages: [
      { 
        key: "category", 
        label: "Category", 
        path: "/new-auth/site/${siteId}/miscellaneous/category" 
      },
      { 
        key: "tax", 
        label: "Tax System", 
        path: "/new-auth/site/${siteId}/miscellaneous/tax-system" 
      },
      { 
        key: "product", 
        label: "Product", 
        path: "/new-auth/site/${siteId}/miscellaneous/product" 
      },
    ],
  },
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the full path for a specific page
 * @param moduleKey - The module (e.g., "billing")
 * @param pageKey - The page (e.g., "list")
 * @param siteId - The site ID to inject into the path
 * @returns The full path or null if not found
 */
export function getPagePath(
  moduleKey: string,
  pageKey: string,
  siteId: string
): string | null {
  const moduleItem = MODULES.find(m => m.key === moduleKey);
  if (!moduleItem) return null;
  
  const page = moduleItem.pages.find(p => p.key === pageKey);
  if (!page) return null;
  
  return page.path.replace('${siteId}', siteId);
}

/**
 * Check if a user can access a specific page
 */
export function canAccessPage(
  permissions: Record<string, string[]> | undefined,
  moduleKey: string,
  pageKey: string
): boolean {
  if (!permissions) return false;
  return permissions[moduleKey]?.includes(pageKey) ?? false;
}

/**
 * Check if a user has access to any page in a module
 */
export function canAccessModule(
  permissions: Record<string, string[]> | undefined,
  moduleKey: string
): boolean {
  if (!permissions) return false;
  return (permissions[moduleKey]?.length ?? 0) > 0;
}

/**
 * Get all accessible pages for a user
 */
export function getAccessiblePages(
  permissions: Record<string, string[]> | undefined,
  siteId: string
): Array<{ module: string; page: string; path: string; label: string }> {
  if (!permissions) return [];

  const accessiblePages: Array<{ 
    module: string; 
    page: string; 
    path: string; 
    label: string 
  }> = [];

  MODULES.forEach((moduleItem) => {
    const allowedPageKeys = permissions[moduleItem.key] || [];
    
    allowedPageKeys.forEach((pageKey) => {
      const page = moduleItem.pages.find(p => p.key === pageKey);
      if (page) {
        accessiblePages.push({
          module: moduleItem.label,
          page: pageKey,
          path: page.path.replace('${siteId}', siteId),
          label: page.label,
        });
      }
    });
  });

  return accessiblePages;
}


export function getFirstAccessiblePage(
  permissions: Record<string, string[]> | undefined,
  siteId: string
): string {
  // Default fallback
  const defaultPath = `/new-auth/site/${siteId}/billing`;
  
  if (!permissions || typeof permissions !== 'object') {
    return defaultPath;
  }

  // Priority order for modules
  const modulePriority: ModuleKey[] = ["sale", "royalty-reward", "miscellaneous"];

  for (const moduleKey of modulePriority) {
    const pages = permissions[moduleKey];
    
    if (Array.isArray(pages) && pages.length > 0) {
      const moduleItem = MODULES.find(m => m.key === moduleKey);
      if (moduleItem) {
        const firstPage = moduleItem.pages.find(p => p.key === pages[0]);
        if (firstPage) {
          return firstPage.path.replace('${siteId}', siteId);
        }
      }
    }
  }

  // Fallback if no permissions found
  return defaultPath;
}

/**
 * Check if a given path matches any of the user's allowed pages.
 * Used by middleware for permission checking.
 *
 * FIX: Removed the reverse startsWith check (`normalizedAllowed.startsWith(normalizedRequest + '/')`)
 * which was causing short paths (e.g. /billing) to incorrectly match longer allowed paths
 * (e.g. /billing/stock), leading to redirect loops.
 */
export function checkPathPermission(
  permissions: Record<string, string[]> | undefined,
  requestedPath: string,
  siteId: string
): boolean {
  if (!permissions || typeof permissions !== 'object') {
    return false;
  }

  // Normalize the requested path (remove leading slash, convert to lowercase)
  const normalizedRequest = requestedPath.replace(/^\//, '').toLowerCase();

  // Check each module's permissions
  for (const [moduleKey, pageKeys] of Object.entries(permissions)) {
    if (!Array.isArray(pageKeys)) continue;

    for (const pageKey of pageKeys) {
      const allowedFullPath = getPagePath(moduleKey, pageKey, siteId);
      
      if (allowedFullPath) {
        // Normalize the allowed path
        const normalizedAllowed = allowedFullPath.replace(/^\//, '').toLowerCase();
        
        // ✅ FIXED: Only check in one direction:
        // - Exact match: /billing === /billing
        // - Request is a sub-path of allowed: /billing/details starts with /billing/
        //
        // REMOVED: normalizedAllowed.startsWith(normalizedRequest + '/')
        // That line caused /billing to incorrectly grant access to /billing/stock,
        // and when /billing/stock wasn't the redirect target it would loop forever.
        if (
          normalizedRequest === normalizedAllowed ||
          normalizedRequest.startsWith(normalizedAllowed + '/')
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get a map of all paths for quick lookup
 * Used internally by middleware
 */
export function getPathMap(siteId: string): Record<string, Record<string, string>> {
  const pathMap: Record<string, Record<string, string>> = {};
  
  MODULES.forEach(moduleItem => {
    pathMap[moduleItem.key] = {};
    moduleItem.pages.forEach(page => {
      pathMap[moduleItem.key][page.key] = page.path.replace('${siteId}', siteId);
    });
  });
  
  return pathMap;
}

/**
 * Get human-readable permission labels
 * Used for displaying permissions in the UI
 */
export function getPermissionLabels(
  permissions: Record<string, string[]> | undefined
): string[] {
  if (!permissions) return [];
  
  const labels: string[] = [];
  
  Object.entries(permissions).forEach(([moduleKey, pageKeys]) => {
    const moduleItem = MODULES.find(m => m.key === moduleKey);
    if (moduleItem && Array.isArray(pageKeys)) {
      pageKeys.forEach(pageKey => {
        const page = moduleItem.pages.find(p => p.key === pageKey);
        if (page) {
          labels.push(`${moduleItem.label} - ${page.label}`);
        }
      });
    }
  });
  
  return labels;
}