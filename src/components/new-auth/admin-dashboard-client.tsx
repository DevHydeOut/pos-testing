"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/new-auth/nav/navbar';
import { 
  Plus, Users, Building2, Loader2, 
  UserPlus, Settings, Copy, Check, Eye, EyeOff,
  Shield, Info, AlertCircle, Activity, ChevronRight
} from 'lucide-react';

interface Site {
  id: string;
  name: string;
  siteId: string;
  _count: { sitePermissions: number };
  createdAt: Date;
}

interface SitePermission {
  id: string;
  site: {
    id: string;
    name: string;
    siteId: string;
  };
}

interface SubUser {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  sitePermissions: SitePermission[];
  createdAt: Date;
}

interface Props {
  initialSites: Site[];
  initialSubUsers: SubUser[];
  user: {
    email?: string | null;
    name?: string | null;
    companyCode?: string;
  };
}

export function AdminDashboardClient({ initialSites, initialSubUsers, user }: Props) {
  const router = useRouter();
  const sites = initialSites;
  const subUsers = initialSubUsers;
  const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [companyCodeVisible, setCompanyCodeVisible] = useState(false);
  const [companyCodeCopied, setCompanyCodeCopied] = useState(false);

  const [siteFormData, setSiteFormData] = useState({ name: "" });
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
  });

  const [error, setError] = useState("");

  const handleCopyCompanyCode = () => {
    if (user.companyCode) {
      navigator.clipboard.writeText(user.companyCode);
      setCompanyCodeCopied(true);
      setTimeout(() => setCompanyCodeCopied(false), 2000);
    }
  };

  const handleCreateSite = () => {
    if (!siteFormData.name.trim()) {
      setError("Site name is required");
      return;
    }
    
    setError("");
    startTransition(async () => {
      const { createSite } = await import("@/actions/new-auth");
      const result = await createSite(siteFormData);
      if (result.error) setError(result.error);
      else if (result.site) {
        setIsCreateSiteOpen(false);
        setSiteFormData({ name: "" });
        router.refresh();
      }
    });
  };

  const handleCreateUser = () => {
    if (!userFormData.username.trim() || !userFormData.password.trim()) {
      setError("Username and password are required");
      return;
    }
    
    setError("");
    startTransition(async () => {
      const { createSubUser } = await import("@/actions/new-auth");
      const result = await createSubUser(userFormData);
      if (result.error) setError(result.error);
      else if (result.user) {
        setIsCreateUserOpen(false);
        setUserFormData({ username: "", password: "", name: "", email: "" });
        router.refresh();
      }
    });
  };

  const totalUsers = subUsers.length;
  const totalSiteAssignments = subUsers.reduce(
    (acc, user) => acc + user.sitePermissions.length,
    0
  );
  const avgSitesPerUser = totalUsers > 0 ? (totalSiteAssignments / totalUsers).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar Component */}
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section with Company Code */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.name || "Admin"}
            </h2>
            <p className="text-sm text-gray-600">
              Manage your organization from one place
            </p>
          </div>

          {/* Company Code Section */}
          {user.companyCode && (
            <Card className="border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-0.5">Company Code</div>
                    <code className="text-base font-bold tracking-wider text-gray-900 font-mono">
                      {companyCodeVisible ? user.companyCode : "••••••••••"}
                    </code>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCompanyCodeVisible(!companyCodeVisible)}
                      className="h-8 w-8 hover:bg-gray-100"
                    >
                      {companyCodeVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCompanyCode}
                      className="h-8 w-8 hover:bg-gray-100"
                    >
                      {companyCodeCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-gray-600">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-violet-600" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-gray-600">Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{totalSiteAssignments}</p>
                <p className="text-xs text-gray-500">{avgSitesPerUser} avg per user</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Quick Actions</p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => setIsCreateUserOpen(true)} 
                    className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-9 justify-start"
                    size="sm"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                  <Button 
                    onClick={() => setIsCreateSiteOpen(true)} 
                    variant="outline"
                    className="w-full h-9 justify-start hover:bg-gray-50"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Site
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600">
            <TabsTrigger 
              value="users"
              className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="sites"
              className="rounded-md px-6 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              Sites
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-gray-900">Team Members</h3>
                <p className="text-sm text-gray-600">
                  {totalUsers} {totalUsers === 1 ? 'member' : 'members'} in your organization
                </p>
              </div>
              <Button onClick={() => setIsCreateUserOpen(true)} className="gap-2 shadow-sm">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </div>

            {subUsers.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
                  <p className="text-gray-600 mb-6 max-w-sm">
                    Add your first team member and assign them to sites with specific permissions
                  </p>
                  <Button onClick={() => setIsCreateUserOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add First Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subUsers.map(subUser => (
                  <Card key={subUser.id} className="border shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {subUser.name || "No Name"}
                              </h4>
                              <Badge variant="secondary" className="font-mono text-xs mt-1">
                                @{subUser.username}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {subUser.email && (
                            <p className="text-gray-600 truncate">{subUser.email}</p>
                          )}
                          <p className="text-gray-600">
                            {subUser.sitePermissions.length} {subUser.sitePermissions.length === 1 ? 'site' : 'sites'}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/new-auth/admin/users/${subUser.id}`)}
                          className="w-full h-8 text-xs"
                        >
                          <Settings className="h-3 w-3 mr-1.5" />
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sites Tab */}
          <TabsContent value="sites" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-gray-900">Locations</h3>
                <p className="text-sm text-gray-600">
                  {sites.length} {sites.length === 1 ? 'location' : 'locations'} configured
                </p>
              </div>
              <Button onClick={() => setIsCreateSiteOpen(true)} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Site</span>
              </Button>
            </div>

            {sites.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No sites yet</h3>
                  <p className="text-gray-600 mb-6 max-w-sm">
                    Create your first site to start organizing your team and resources
                  </p>
                  <Button onClick={() => setIsCreateSiteOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Site
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sites.map(site => (
                  <Card 
                    key={site.id} 
                    className="border shadow-sm hover:shadow hover:border-gray-300 transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-4">
                        <h4 className="font-semibold text-gray-900 text-sm">{site.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{site.siteId}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-4">
                        <Users className="h-3.5 w-3.5" />
                        <span>{site._count.sitePermissions} {site._count.sitePermissions === 1 ? 'user' : 'users'}</span>
                      </div>

                      <Button
                        size="sm"
                        className="w-full h-9 justify-between"
                        onClick={() => router.push(`/new-auth/admin/sites/${site.id}`)}
                      >
                        <span>Manage Site</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Site Dialog */}
        <Dialog open={isCreateSiteOpen} onOpenChange={setIsCreateSiteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
              <DialogDescription>Add a new location to your organization</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="site-name" className="text-sm font-medium">Site Name</Label>
                <Input
                  id="site-name"
                  placeholder="e.g., Downtown Office"
                  value={siteFormData.name}
                  onChange={e => setSiteFormData({ name: e.target.value })}
                  className="h-10"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateSiteOpen(false);
                    setSiteFormData({ name: "" });
                    setError("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSite} disabled={isPending} className="gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Site
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>Create a new user account for your team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="username"
                      value={userFormData.username}
                      onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                      placeholder="john.doe"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={userFormData.password}
                      onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                      placeholder="••••••••"
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="name"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-10"
                  />
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-gray-700">
                  Assign sites and configure permissions after creating the user
                </AlertDescription>
              </Alert>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateUserOpen(false);
                    setUserFormData({ username: "", password: "", name: "", email: "" });
                    setError("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={isPending} className="gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}