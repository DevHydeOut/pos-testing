'use client';

import { useEffect, useState } from 'react';
import { getAllProducts } from '@/actions/module/product';
import { StockAddForm } from './stock-form';
import StockBatchList from './stock-table';
import StockOverviewPage from './stock-chart';
import { Product } from '@prisma/client'; // FIX: line 15 — import proper type

interface Props {
  mode: 'add' | 'view' | 'details';
}

export default function StockSwitcher({ mode }: Props) {
  const [products, setProducts] = useState<Product[]>([]); // FIX: replaced `any[]` with `Product[]`

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await getAllProducts();
      setProducts(res);
    };
    fetchProducts();
  }, []);

  if (mode === 'add') {
    return <StockAddForm products={products} />;
  }
  if (mode === 'details') {
    return <StockOverviewPage />;
  }
  return <StockBatchList />;
}