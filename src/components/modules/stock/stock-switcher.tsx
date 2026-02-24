// File: src/components/modules/stock/stock-switcher.tsx
"use client";

import { useEffect, useState } from "react";
import { getAllProducts } from "@/actions/module/product";
import { StockAddForm } from "./stock-form";
import StockBatchList from "./stock-table";
import StockOverviewPage from "./stock-chart";
import { StockTransferForm } from "./transfer-form";
import TransferHistory from "./transfer-history";
import { Product } from "@prisma/client";

interface Props {
  mode: "add" | "view" | "details" | "transfer" | "history";
}

export default function StockSwitcher({ mode }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Only fetch products for modes that need them
    if (mode === "add" || mode === "transfer") {
      getAllProducts().then(setProducts);
    }
  }, [mode]);

  if (mode === "add")      return <StockAddForm products={products} />;
  if (mode === "details")  return <StockOverviewPage />;
  if (mode === "transfer") return <StockTransferForm products={products} />;
  if (mode === "history")  return <TransferHistory />;
  return <StockBatchList />;
}