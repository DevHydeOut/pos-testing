// File: src/components/modules/stock/transfer-history.tsx
"use client";

import { useEffect, useState } from "react";
import { getTransferHistory } from "@/actions/module/stock";
import { Loader2, ArrowUpRight, ArrowDownLeft, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";

// Shape returned by getTransferHistory
interface TransferMovement {
  id: string;
  productId: string;
  siteId: string;
  quantity: number;
  remark: string | null;
  sourceId: string | null; // transferRef e.g. "TRANSFER-1234567890"
  createdAt: Date;
  product: { name: string };
}

// Grouped by transferRef
interface TransferGroup {
  transferRef: string;
  date: Date;
  remark: string;
  direction: "OUT" | "IN"; // OUT = sent, IN = received
  counterSiteName: string; // extracted from remark
  items: { productName: string; quantity: number }[];
}

function extractCounterSite(remark: string | null, direction: "OUT" | "IN"): string {
  if (!remark) return "Unknown site";
  // remark format: "Transfer to SiteName: optional note" or "Transfer from SiteName: optional note"
  const prefix = direction === "OUT" ? "Transfer to " : "Transfer from ";
  const afterPrefix = remark.startsWith(prefix) ? remark.slice(prefix.length) : remark;
  // strip the optional ": note" part
  return afterPrefix.split(":")[0].trim() || "Unknown site";
}

function groupMovements(movements: TransferMovement[], currentSiteId: string): TransferGroup[] {
  const map = new Map<string, TransferGroup>();

  for (const m of movements) {
    const ref = m.sourceId ?? m.id;
    // Determine direction from remark
    const isOut = m.remark?.startsWith("Transfer to") ?? false;
    const direction: "OUT" | "IN" = isOut ? "OUT" : "IN";
    const counterSite = extractCounterSite(m.remark, direction);

    if (map.has(ref)) {
      map.get(ref)!.items.push({ productName: m.product.name, quantity: m.quantity });
    } else {
      // Clean remark: strip the site prefix, keep only the user note
      const remarkText = m.remark ?? "";
      const colonIdx = remarkText.indexOf(":");
      const userNote = colonIdx !== -1 ? remarkText.slice(colonIdx + 1).trim() : "";

      map.set(ref, {
        transferRef: ref,
        date: new Date(m.createdAt),
        remark: userNote,
        direction,
        counterSiteName: counterSite,
        items: [{ productName: m.product.name, quantity: m.quantity }],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

function TransferCard({ group }: { group: TransferGroup }) {
  const isOut = group.direction === "OUT";

  return (
    <Card className="border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isOut ? (
              <div className="bg-orange-100 p-1.5 rounded-full">
                <ArrowUpRight className="w-4 h-4 text-orange-600" />
              </div>
            ) : (
              <div className="bg-green-100 p-1.5 rounded-full">
                <ArrowDownLeft className="w-4 h-4 text-green-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">
                {isOut ? `Sent to` : `Received from`}{" "}
                <span className={isOut ? "text-orange-600" : "text-green-600"}>
                  {group.counterSiteName}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(group.date, "dd MMM yyyy, hh:mm a")}
              </p>
            </div>
          </div>
          <Badge variant={isOut ? "destructive" : "default"} className="shrink-0 text-xs">
            {isOut ? "Outgoing" : "Incoming"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Products table */}
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs">
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-right px-3 py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td className="px-3 py-2 text-xs text-muted-foreground font-medium">
                  {group.items.length} product{group.items.length !== 1 ? "s" : ""}
                </td>
                <td className="px-3 py-2 text-right text-xs font-semibold">
                  {group.items.reduce((s, i) => s + i.quantity, 0)} units
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* User note */}
        {group.remark && (
          <p className="text-xs text-muted-foreground italic">
            Note: {group.remark}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TransferHistory() {
  const [movements, setMovements] = useState<TransferMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const data = await getTransferHistory();
      setMovements(data as TransferMovement[]);
      setLoading(false);
    };
    fetch();
  }, []);

  // Group all movements
  const allGroups = groupMovements(movements, "");

  // Filter by search (product name or counter site)
  const filtered = allGroups.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.counterSiteName.toLowerCase().includes(q) ||
      g.items.some((i) => i.productName.toLowerCase().includes(q)) ||
      g.remark.toLowerCase().includes(q)
    );
  });

  const outgoing = filtered.filter((g) => g.direction === "OUT");
  const incoming = filtered.filter((g) => g.direction === "IN");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading transfer history...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <Input
        placeholder="Search by product, site or note..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {allGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <PackageCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">No transfers yet.</p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All&nbsp;
              <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5">{filtered.length}</span>
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Sent&nbsp;
              <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5">{outgoing.length}</span>
            </TabsTrigger>
            <TabsTrigger value="incoming">
              Received&nbsp;
              <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5">{incoming.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No results found.</p>
              ) : (
                filtered.map((g) => <TransferCard key={g.transferRef} group={g} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="outgoing">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No outgoing transfers.</p>
              ) : (
                outgoing.map((g) => <TransferCard key={g.transferRef} group={g} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="incoming">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No incoming transfers.</p>
              ) : (
                incoming.map((g) => <TransferCard key={g.transferRef} group={g} />)
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}