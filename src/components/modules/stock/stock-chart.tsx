"use client";

import { useEffect, useState } from "react";
import { getStockByProduct } from "@/actions/module/stock";
import { Product } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface StockEntry {
  product: Product;
  totalQuantity: number;
  lastUpdated: Date;
}

const PAGE_SIZE = 10;

export default function StockOverviewPage() {
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchStock = async () => {
      const data = await getStockByProduct({
        from: dateRange?.from,
        to: dateRange?.to,
      });
      setStock(data);
    };
    fetchStock();
  }, [dateRange]);

  // Search
  const filteredStock = stock.filter((s) =>
    s.product.name.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredStock.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const currentStock = filteredStock.slice(startIndex, startIndex + PAGE_SIZE);

  // Quick filters
  const setQuickFilter = (type: "today" | "yesterday" | "month" | "clear") => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    if (type === "today") {
      from = new Date(now.setHours(0, 0, 0, 0));
      to = new Date();
    } else if (type === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      from = new Date(y.setHours(0, 0, 0, 0));
      to = new Date(y.setHours(23, 59, 59, 999));
    } else if (type === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
    } else {
      from = undefined;
      to = undefined;
    }

    setDateRange(type === "clear" ? undefined : { from, to });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stock Overview</h2>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <Input
          placeholder="Search product..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[250px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.from, "dd/MM/yyyy")}`
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setPage(2);
              }}
              className="w-full"
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Quick Filters */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setQuickFilter("today")}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setQuickFilter("yesterday")}>
            Yesterday
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setQuickFilter("month")}>
            This Month
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setQuickFilter("clear")}>
            Clear
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      {currentStock.length === 0 ? (
        <p className="text-muted-foreground">No stock found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Total Quantity</th>
                  <th className="text-left p-2">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {currentStock.map((s, i) => (
                  <tr key={s.product.id} className="border-t">
                    <td className="p-2">{startIndex + i + 1}</td>
                    <td className="p-2">{s.product.name}</td>
                    <td className="p-2">{s.totalQuantity}</td>
                    <td className="p-2">
                      {new Date(s.lastUpdated).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
