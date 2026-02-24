"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, Users, Loader2, Edit, Trash2, 
  Building2, AlertCircle, Settings, X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MODULES } from '@/lib/permissions';

interface Site {
  id: string;
  name: string;
  siteId: string;
}

interface UserSitePermission {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  permissionId: string;
  createdAt: Date;
  pagePermissions: Record<string, string[]>;
}

interface Props {
  site: Site;
  subUsers: UserSitePermission[];
}

export function SiteManagementClient({ site, subUsers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
  const [isDeleteSiteOpen, setIsDeleteSiteOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  
  const [editingSiteData, setEditingSiteData] = useState({
    name: site.name,
    siteId: site.siteId,
  });
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<{
    pagePermissions: Record<string, string[]>;
  } | null>(null);
  
  const [error, setError] = useState('');

  // Permission helpers
  const togglePagePermission = (moduleKey: string, pageKey: string) => {
    if (!editingPermissions) return;
    
    const currentPages = editingPermissions.pagePermissions[moduleKey] || [];
    const isSelected = currentPages.includes(pageKey);
    
    setEditingPermissions({
      ...editingPermissions,
      pagePermissions: {
        ...editingPermissions.pagePermissions,
        [moduleKey]: isSelected
          ? currentPages.filter(p => p !== pageKey)
          : [...currentPages, pageKey]
      }
    });
  };

  const toggleModulePermission = (moduleKey: string, checked: boolean) => {
    if (!editingPermissions) return;
    
    // FIX: lines 93, 108, 119 — renamed `module` → `mod` (reserved Next.js variable)
    const mod = MODULES.find(m => m.key === moduleKey);
    if (!mod) return;
    
    setEditingPermissions({
      ...editingPermissions,
      pagePermissions: {
        ...editingPermissions.pagePermissions,
        [moduleKey]: checked ? mod.pages.map(p => p.key) : []
      }
    });
  };

  const isModuleFullySelected = (moduleKey: string) => {
    if (!editingPermissions) return false;
    
    // FIX: renamed `module` → `mod`
    const mod = MODULES.find(m => m.key === moduleKey);
    if (!mod) return false;
    
    const selectedPages = editingPermissions.pagePermissions[moduleKey] || [];
    return mod.pages.length > 0 && selectedPages.length === mod.pages.length;
  };

  const isModulePartiallySelected = (moduleKey: string) => {
    if (!editingPermissions) return false;
    
    const selectedPages = editingPermissions.pagePermissions[moduleKey] || [];
    // FIX: renamed `module` → `mod`
    const mod = MODULES.find(m => m.key === moduleKey);
    return selectedPages.length > 0 && selectedPages.length < (mod?.pages.length || 0);
  };

  // Edit site
  const handleEditSite = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    startTransition(async () => {
      const { updateSite } = await import('@/actions/new-auth');
      const result = await updateSite(site.id, editingSiteData);
      
      if (result.error) {
        setError(result.error);
      } else {
        setIsEditSiteOpen(false);
        router.refresh();
      }
    });
  };

  // Delete site
  const handleDeleteSite = () => {
    startTransition(async () => {
      const { deleteSite } = await import('@/actions/new-auth');
      const result = await deleteSite(site.id);
      
      if (result.error) {
        setError(result.error);
        setIsDeleteSiteOpen(false);
      } else {
        router.push('/new-auth/admin/dashboard');
      }
    });
  };

  // Edit user permissions
  const handleEditPermissions = (user: UserSitePermission) => {
    setEditingUserId(user.id);
    setEditingPermissions({
      pagePermissions: user.pagePermissions || {},
    });
    setIsEditPermissionsOpen(true);
  };

  const handleSavePermissions = () => {
    if (!editingPermissions || !editingUserId) return;
    setError('');

    const hasPagePermissions = Object.values(editingPermissions.pagePermissions).some(pages => pages.length > 0);
    if (!hasPagePermissions) {
      setError('Please select at least one page permission');
      return;
    }

    startTransition(async () => {
      const { updateSitePermission } = await import('@/actions/new-auth');
      
      const result = await updateSitePermission(editingUserId, site.id, {
        pagePermissions: editingPermissions.pagePermissions,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setIsEditPermissionsOpen(false);
        setEditingUserId(null);
        setEditingPermissions(null);
        router.refresh();
      }
    });
  };

  const handleRemoveUser = (userId: string) => {
    startTransition(async () => {
      const { removeSiteFromUser } = await import('@/actions/new-auth');
      await removeSiteFromUser(userId, site.id);
      router.refresh();
    });
  };

  // Get readable page permissions
  const getReadablePagePermissions = (pagePermissions: Record<string, string[]>) => {
    const readable: string[] = [];
    Object.entries(pagePermissions).forEach(([moduleKey, pageKeys]) => {
      // FIX: line 205 — renamed `module` → `mod`
      const mod = MODULES.find(m => m.key === moduleKey);
      if (mod && pageKeys.length > 0) {
        pageKeys.forEach(pageKey => {
          const page = mod.pages.find(p => p.key === pageKey);
          if (page) {
            readable.push(`${mod.label} - ${page.label}`);
          }
        });
      }
    });
    return readable;
  };

  // FIX: line 218 — removed unused `getRoleBadgeColor` function

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/new-auth/admin/dashboard')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {site.siteId}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {subUsers.length} {subUsers.length === 1 ? 'user' : 'users'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingSiteData({ name: site.name, siteId: site.siteId });
                  setIsEditSiteOpen(true);
                }}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeleteSiteOpen(true)}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Users List */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Users with Access</h2>
          <p className="text-sm text-gray-600 mt-1">
            {subUsers.length} {subUsers.length === 1 ? 'user has' : 'users have'} access to this site
          </p>
        </div>

        {subUsers.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users assigned</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                No users have access to this site yet. Assign users from the dashboard.
              </p>
              <Button 
                onClick={() => router.push('/new-auth/admin/dashboard?tab=users')}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Go to Users
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {subUsers.map((user) => {
              const readablePermissions = getReadablePagePermissions(user.pagePermissions);
              
              return (
                <Card key={user.id} className="border shadow-sm hover:shadow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {user.name || 'No Name'}
                            </h4>
                            <Badge variant="secondary" className="font-mono text-xs flex-shrink-0">
                              @{user.username}
                            </Badge>
                          </div>
                          {user.email && (
                            <p className="text-xs text-gray-600 truncate">{user.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPermissions(user)}
                          className="h-8 w-8"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUser(user.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {readablePermissions.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Accessible Pages ({readablePermissions.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {readablePermissions.slice(0, 5).map((perm, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {readablePermissions.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{readablePermissions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Site Dialog */}
      <Dialog open={isEditSiteOpen} onOpenChange={setIsEditSiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update site details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Site Name</Label>
              <Input
                id="name"
                value={editingSiteData.name}
                onChange={(e) => setEditingSiteData({ ...editingSiteData, name: e.target.value })}
                required
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditSiteOpen(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Permissions Dialog */}
      <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Configure role and page permissions
            </DialogDescription>
          </DialogHeader>
          
          {editingPermissions && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Page Permissions *</Label>
                <div className="text-xs text-gray-500 mb-2">
                  Select which pages this user can access
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Accordion type="multiple" className="w-full">
                    {MODULES.map((mod) => {  {/* FIX: renamed loop variable `module` → `mod` */}
                      const selectedPages = editingPermissions.pagePermissions[mod.key] || [];
                      const isFullySelected = isModuleFullySelected(mod.key);
                      const isPartiallySelected = isModulePartiallySelected(mod.key);

                      return (
                        <AccordionItem key={mod.key} value={mod.key} className="border-b last:border-0">
                          <div className="flex items-center gap-3 px-4 py-3">
                            <Checkbox
                              checked={isFullySelected}
                              ref={(el) => {
                                if (el) {
                                  const input = el.querySelector('button') as HTMLButtonElement & { indeterminate?: boolean };
                                  if (input) input.indeterminate = isPartiallySelected;
                                }
                              }}
                              onCheckedChange={(checked) => 
                                toggleModulePermission(mod.key, checked as boolean)
                              }
                            />
                            <AccordionTrigger className="flex-1 hover:no-underline py-0">
                              <div className="flex items-center justify-between w-full pr-2">
                                <span className="text-sm font-medium">
                                  {mod.label}
                                </span>
                                {selectedPages.length > 0 && (
                                  <Badge variant="secondary" className="text-xs mr-2">
                                    {selectedPages.length} selected
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2 pl-9">
                              {mod.pages.map((page) => (
                                <div key={page.key} className="flex items-center gap-3 py-1.5">
                                  <Checkbox
                                    checked={selectedPages.includes(page.key)}
                                    onCheckedChange={() => togglePagePermission(mod.key, page.key)}
                                    id={`edit-${mod.key}-${page.key}`}
                                  />
                                  <Label
                                    htmlFor={`edit-${mod.key}-${page.key}`}
                                    className="flex-1 cursor-pointer text-sm"
                                  >
                                    <div className="font-medium text-gray-900">{page.label}</div>
                                    <div className="text-xs text-gray-500">{page.path}</div>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsEditPermissionsOpen(false);
                setEditingUserId(null);
                setEditingPermissions(null);
                setError('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePermissions} 
              disabled={isPending}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Site Alert Dialog */}
      <AlertDialog open={isDeleteSiteOpen} onOpenChange={setIsDeleteSiteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete <strong>{site.name}</strong>?
                </p>
                
                {subUsers.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Warning:</strong> {subUsers.length} user(s) have access to this site.
                      All permissions will be removed.
                    </p>
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSite}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}