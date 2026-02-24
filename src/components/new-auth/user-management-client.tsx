"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, Building2, Loader2, Plus, Trash2, 
  Users, AlertCircle, Edit2, AlertTriangle
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

interface SitePermission {
  id: string;
  role: string;
  site: Site;
  pagePermissions?: Record<string, string[]>;
}

interface SubUser {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  sitePermissions: SitePermission[];
}

interface Props {
  user: SubUser;
  availableSites: Site[];
}

export function UserManagementClient({ user, availableSites }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Dialogs
  const [isAssignSiteOpen, setIsAssignSiteOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [siteToRemove, setSiteToRemove] = useState<string | null>(null);
  
  // Form data
  const [assignFormData, setAssignFormData] = useState({
    siteId: '',
  });
  
  const [editFormData, setEditFormData] = useState<{
    siteId: string;
    pagePermissions: Record<string, string[]>;
  } | null>(null);
  
  const [pagePermissions, setPagePermissions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');

  // Edit user form
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Get unassigned sites
  const unassignedSites = availableSites.filter(
    site => !user.sitePermissions?.some(p => p.site.id === site.id)
  );

  // Permission helpers
  const togglePagePermission = (moduleKey: string, pageKey: string, isEdit = false) => {
    const current = isEdit ? editFormData?.pagePermissions : pagePermissions;
    
    if (!current) return;
    
    const currentPages = current[moduleKey] || [];
    const isSelected = currentPages.includes(pageKey);
    
    const updated = {
      ...current,
      [moduleKey]: isSelected
        ? currentPages.filter(p => p !== pageKey)
        : [...currentPages, pageKey]
    };
    
    if (isEdit && editFormData) {
      setEditFormData({ ...editFormData, pagePermissions: updated });
    } else {
      setPagePermissions(updated);
    }
  };

  const toggleModulePermission = (moduleKey: string, checked: boolean, isEdit = false) => {
    const moduleItem = MODULES.find(m => m.key === moduleKey);
    if (!moduleItem) return;
    
    const updated = checked ? moduleItem.pages.map(p => p.key) : [];
    
    if (isEdit && editFormData) {
      setEditFormData({
        ...editFormData,
        pagePermissions: {
          ...editFormData.pagePermissions,
          [moduleKey]: updated
        }
      });
    } else {
      setPagePermissions(prev => ({
        ...prev,
        [moduleKey]: updated
      }));
    }
  };

  const isModuleFullySelected = (moduleKey: string, permissions: Record<string, string[]>) => {
    const moduleItem = MODULES.find(m => m.key === moduleKey);
    if (!moduleItem) return false;
    
    const selectedPages = permissions[moduleKey] || [];
    return moduleItem.pages.length > 0 && selectedPages.length === moduleItem.pages.length;
  };

  const isModulePartiallySelected = (moduleKey: string, permissions: Record<string, string[]>) => {
    const selectedPages = permissions[moduleKey] || [];
    const moduleItem = MODULES.find(m => m.key === moduleKey);
    return selectedPages.length > 0 && selectedPages.length < (moduleItem?.pages.length || 0);
  };

  // Assign site
  const handleAssignSite = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assignFormData.siteId) {
      setError('Please select a site');
      return;
    }

    const hasPagePermissions = Object.values(pagePermissions).some(pages => pages.length > 0);
    if (!hasPagePermissions) {
      setError('Please select at least one page permission');
      return;
    }

    startTransition(async () => {
      const { assignSiteToUser } = await import('@/actions/new-auth');
      const result = await assignSiteToUser(user.id, {
        siteId: assignFormData.siteId,
        pagePermissions: pagePermissions,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setIsAssignSiteOpen(false);
        setAssignFormData({ siteId: '' });
        setPagePermissions({});
        router.refresh();
      }
    });
  };

  // Edit permissions
  const handleEditPermissions = (permission: SitePermission) => {
    setEditFormData({
      siteId: permission.site.id,
      pagePermissions: permission.pagePermissions || {},
    });
    setIsEditPermissionsOpen(true);
  };

  const handleSavePermissions = () => {
    if (!editFormData) return;
    setError('');

    const hasPagePermissions = Object.values(editFormData.pagePermissions).some(pages => pages.length > 0);
    if (!hasPagePermissions) {
      setError('Please select at least one page permission');
      return;
    }

    startTransition(async () => {
      const { updateSitePermission } = await import('@/actions/new-auth');
      const result = await updateSitePermission(user.id, editFormData.siteId, {
        pagePermissions: editFormData.pagePermissions,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setIsEditPermissionsOpen(false);
        setEditFormData(null);
        router.refresh();
      }
    });
  };

  // Remove site
  const confirmRemoveSite = () => {
    if (!siteToRemove) return;

    startTransition(async () => {
      const { removeSiteFromUser } = await import('@/actions/new-auth');
      await removeSiteFromUser(user.id, siteToRemove);
      setSiteToRemove(null);
      router.refresh();
    });
  };

  // Edit user info
  const handleEditUser = () => {
    setEditUserData({
      name: user.name || '',
      email: user.email || '',
      password: '',
    });
    setIsEditUserOpen(true);
  };

  const handleSaveUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const { updateSubUser } = await import('@/actions/new-auth');
      const result = await updateSubUser(user.id, editUserData);

      if (result.error) {
        setError(result.error);
      } else {
        setIsEditUserOpen(false);
        setEditUserData({ name: '', email: '', password: '' });
        router.refresh();
      }
    });
  };

  // Delete user
  const handleDeleteUser = () => {
    startTransition(async () => {
      const { deleteSubUser } = await import('@/actions/new-auth');
      const result = await deleteSubUser(user.id);

      if (result.error) {
        setError(result.error);
        setIsDeleteUserOpen(false);
      } else {
        router.push('/new-auth/admin/dashboard');
      }
    });
  };

  // Get readable page permissions
  const getReadablePagePermissions = (permissions: SitePermission) => {
    if (!permissions.pagePermissions) return [];
    
    const readable: string[] = [];
    Object.entries(permissions.pagePermissions).forEach(([moduleKey, pageKeys]) => {
      const moduleItem = MODULES.find(m => m.key === moduleKey);
      if (moduleItem && pageKeys.length > 0) {
        pageKeys.forEach(pageKey => {
          const page = moduleItem.pages.find(p => p.key === pageKey);
          if (page) {
            readable.push(`${moduleItem.label} - ${page.label}`);
          }
        });
      }
    });
    return readable;
  };

  // Permission display component - Fixed nested button issue
  const PermissionAccordion = ({ 
    permissions, 
    isEdit = false 
  }: { 
    permissions: Record<string, string[]>; 
    isEdit?: boolean;
  }) => (
    <Accordion type="multiple" className="w-full">
      {MODULES.map((moduleItem) => {
        const selectedPages = permissions[moduleItem.key] || [];
        const isFullySelected = isModuleFullySelected(moduleItem.key, permissions);
        const isPartiallySelected = isModulePartiallySelected(moduleItem.key, permissions);

        return (
          <AccordionItem key={moduleItem.key} value={moduleItem.key} className="border-b last:border-0">
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
                  toggleModulePermission(moduleItem.key, checked as boolean, isEdit)
                }
              />
              <AccordionTrigger className="flex-1 hover:no-underline py-0">
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="text-sm font-medium">
                    {moduleItem.label}
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
                {moduleItem.pages.map((page) => (
                  <div key={page.key} className="flex items-center gap-3 py-1.5">
                    <Checkbox
                      checked={selectedPages.includes(page.key)}
                      onCheckedChange={() => togglePagePermission(moduleItem.key, page.key, isEdit)}
                      id={`${isEdit ? 'edit' : 'assign'}-${moduleItem.key}-${page.key}`}
                    />
                    <Label
                      htmlFor={`${isEdit ? 'edit' : 'assign'}-${moduleItem.key}-${page.key}`}
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
  );

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
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.name || 'No Name'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    @{user.username}
                  </Badge>
                  {user.email && (
                    <span className="text-sm text-gray-600">{user.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEditUser}
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Info</span>
              </Button>
              <Button
                onClick={() => setIsDeleteUserOpen(true)}
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Site Access Card */}
        <Card className="border shadow-sm mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Site Access</CardTitle>
              <CardDescription>
                {user.sitePermissions?.length || 0} {(user.sitePermissions?.length || 0) === 1 ? 'site' : 'sites'} assigned
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAssignSiteOpen(true)}
              disabled={unassignedSites.length === 0}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign Site
            </Button>
          </CardHeader>
        </Card>

        {/* Assigned Sites */}
        {!user.sitePermissions || user.sitePermissions.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sites assigned</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                Assign this user to sites to grant them access with specific permissions
              </p>
              <Button
                onClick={() => setIsAssignSiteOpen(true)}
                disabled={unassignedSites.length === 0}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Assign First Site
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {user.sitePermissions.map((permission) => {
              const readablePermissions = getReadablePagePermissions(permission);
              
              return (
                <Card key={permission.id} className="border shadow-sm hover:shadow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {permission.site.name}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {permission.site.siteId}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPermissions(permission)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSiteToRemove(permission.site.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Assign Site Dialog */}
      <Dialog open={isAssignSiteOpen} onOpenChange={setIsAssignSiteOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Site Access</DialogTitle>
            <DialogDescription>
              Grant access to a site with specific page permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSite} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Site</Label>
                <Select
                  value={assignFormData.siteId}
                  onValueChange={(value) => setAssignFormData({ siteId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedSites.length === 0 ? (
                      <SelectItem value="none" disabled>
                        All sites assigned
                      </SelectItem>
                    ) : (
                      unassignedSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Page Permissions *</Label>
                <div className="text-xs text-gray-500 mb-2">
                  Select which pages this user can access
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <PermissionAccordion permissions={pagePermissions} />
                </div>
              </div>
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
                  setIsAssignSiteOpen(false);
                  setError('');
                  setAssignFormData({ siteId: '' });
                  setPagePermissions({});
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Assigning...' : 'Assign Site'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Update role and page permissions for this site
            </DialogDescription>
          </DialogHeader>

          {editFormData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Page Permissions *</Label>
                <div className="text-xs text-gray-500 mb-2">
                  Select which pages this user can access
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <PermissionAccordion permissions={editFormData.pagePermissions} isEdit={true} />
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
                setEditFormData(null);
                setError('');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Site Confirmation */}
      <AlertDialog open={!!siteToRemove} onOpenChange={() => setSiteToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Site Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove access to this site? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveSite}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Info Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription>
              Update user details for {user.username}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUserInfo} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                />
                <p className="text-xs text-gray-500">Only fill this if you want to change the password</p>
              </div>
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
                  setIsEditUserOpen(false);
                  setEditUserData({ name: '', email: '', password: '' });
                  setError('');
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete <strong>{user.name || user.username}</strong>?
                </p>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">
                    <strong>Warning:</strong> This will permanently delete the user and remove all their site access permissions. This action cannot be undone.
                  </p>
                </div>

                {user.sitePermissions && user.sitePermissions.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      This user currently has access to {user.sitePermissions.length} {user.sitePermissions.length === 1 ? 'site' : 'sites'}.
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
              onClick={handleDeleteUser}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}