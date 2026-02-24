// File: src/app/.../stock/page.tsx
'use client';

import H1tag from "@/components/text/h1";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StockSwitcher from "@/components/modules/stock/stock-switcher";

export default function StockPage() {
  return (
    <main className="container mx-auto">
      <div className="flex justify-between items-end mb-4">
        <H1tag
          H1="Stock Update"
          subHeading=""
          subPara="Manage your stock details here."
        />
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="add">Add Stock</TabsTrigger>
          <TabsTrigger value="view">View Stock</TabsTrigger>
          <TabsTrigger value="details">Stock Overview</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Stock</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <StockSwitcher mode="add" />
        </TabsContent>

        <TabsContent value="view">
          <StockSwitcher mode="view" />
        </TabsContent>

        <TabsContent value="details">
          <StockSwitcher mode="details" />
        </TabsContent>

        <TabsContent value="transfer">
          <StockSwitcher mode="transfer" />
        </TabsContent>

        <TabsContent value="history">
          <StockSwitcher mode="history" />
        </TabsContent>
      </Tabs>
    </main>
  );
}