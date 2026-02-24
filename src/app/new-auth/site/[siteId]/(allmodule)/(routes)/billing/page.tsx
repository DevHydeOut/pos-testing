// app/(allmodule)/(routes)/billing/page.tsx
import BillingSwitcher from "@/components/modules/billing/bill-switcher";
import H1tag from "@/components/text/h1";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSiteContext } from "@/lib/get-site-context";
import { db } from "@/lib/db";

export default async function BillingPage() {
  const userData = await getSiteContext();

  // Get the MainSite to extract the URL uuid (siteId field)
  const site = await db.mainSite.findUnique({
    where: { id: userData.siteId },
    select: { siteId: true }, // ✅ this is the URL uuid
  });

  if (!site) return <div>Site not found</div>;

  return (
    <main className="container mx-auto">
      <div className="flex justify-between items-end mb-4">
        <H1tag
          H1="Billing Information"
          subHeading=""
          subPara="Manage your billing details here."
        />
      </div>
      <Tabs defaultValue="bill" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="bill">Bill</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="bill">
          <BillingSwitcher mode="bill" siteId={site.siteId} />
        </TabsContent>
        <TabsContent value="details">
          <BillingSwitcher mode="details" siteId={site.siteId} />
        </TabsContent>
      </Tabs>
    </main>
  );
}