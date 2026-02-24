"use client";

import { useEffect, useState } from "react";
import { getAllStockBatches } from "@/actions/module/stock";
import { StockMovement, Product } from "@prisma/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface FullStockBatch {
  id: string;
  createdAt: Date;
  remark?: string;
  movements: (StockMovement & { product: Product })[];
}

const PAGE_SIZE = 5;

export default function StockBatchList() {
  const [batches, setBatches] = useState<FullStockBatch[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchBatches = async () => {
      const data = await getAllStockBatches();
      setBatches(data);
    };

    fetchBatches();
  }, []);

  const totalPages = Math.ceil(batches.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const currentBatches = batches.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stock Batches</h2>

      {batches.length === 0 ? (
        <p className="text-muted-foreground">No stock batches found.</p>
      ) : (
        <>
          {/* Collapsible Batches */}
          <Accordion type="multiple" className="space-y-2">
            {currentBatches.map((batch) => (
              <AccordionItem key={batch.id} value={batch.id}>
                <AccordionTrigger className="flex justify-between items-center">
                  <div className="text-left">
                    <div className="font-semibold text-lg">
                      Batch ID: {batch.id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(batch.createdAt).toLocaleString()}
                    </div>
                    {batch.remark && (
                      <div className="text-sm mt-1">Remark: {batch.remark}</div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-muted text-muted-foreground">
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">Batch No</th>
                          <th className="text-left p-2">Qty</th>
                          <th className="text-left p-2">MRP</th>
                          <th className="text-left p-2">Sale Rate</th>
                          <th className="text-left p-2">Purchase Rate</th>
                          <th className="text-left p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.movements.map((m, i) => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2">{i + 1}</td>
                            <td className="p-2">{m.product.name}</td>
                            <td className="p-2">{m.batchNumber || "-"}</td>
                            <td className="p-2">{m.quantity}</td>
                            <td className="p-2">{m.mrp ?? "-"}</td>
                            <td className="p-2">{m.saleRate ?? "-"}</td>
                            <td className="p-2">{m.purchaseRate ?? "-"}</td>
                            <td className="p-2">
                              ₹{(m.purchaseRate ?? 0) * m.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Pagination */}
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
        </>
      )}
    </div>
  );
}
