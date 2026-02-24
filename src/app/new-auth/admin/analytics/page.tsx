import { auth } from "@/auth-new";
import { redirect } from "next/navigation";
import { getSiteSalesSummary, getAllSitesAuditLogs } from "@/actions/admin-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/new-auth/login");
  }
  
  const summaryResult = await getSiteSalesSummary();
  const auditResult = await getAllSitesAuditLogs(50);
  
  if (summaryResult.error) {
    return <div>Error: {summaryResult.error}</div>;
  }
  
  const summary = summaryResult.siteSummary || [];
  const totalRevenue = summary.reduce((sum, site) => sum + site.totalRevenue, 0);
  const totalSales = summary.reduce((sum, site) => sum + site.totalSales, 0);
  const totalAppointments = summary.reduce((sum, site) => sum + site.totalAppointments, 0);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">All Sites Analytics</h1>
      
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAppointments}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Site-wise Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Site-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.map(site => (
              <div key={site.siteId} className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{site.siteName}</h3>
                    <p className="text-sm text-gray-500">{site.siteId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{site.totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{site.totalSales} sales</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-600">Products:</span> {site.totalProducts}
                  </div>
                  <div>
                    <span className="text-gray-600">Patients:</span> {site.totalPatients}
                  </div>
                  <div>
                    <span className="text-gray-600">Appointments:</span> {site.totalAppointments}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      {auditResult.success && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Across All Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditResult.auditLogs?.slice(0, 10).map(log => (
                <div key={log.id} className="flex justify-between items-start text-sm border-b pb-2">
                  <div>
                    <p className="font-medium">{log.userName} ({log.userRole})</p>
                    <p className="text-gray-600">{log.changes || `${log.action} ${log.entityType}`}</p>
                    <p className="text-xs text-gray-400">{log.site.name}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}