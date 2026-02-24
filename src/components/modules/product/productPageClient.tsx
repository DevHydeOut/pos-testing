// components/modules/product/productPageClient.tsx
"use client";

import { Category, Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import H1tag from "@/components/text/h1";
import { EntityDialog } from "@/components/modules/common/EntityDialog";
import { ProductForm } from "./product-form";
import { ProductTable } from "./product-table";

interface ExtendedProduct extends Product {
  category: Category;
}

interface Props {
  products: ExtendedProduct[];
  categories: Category[];
}

export function ProductPageClient({ products, categories }: Props) {
  return (
    <>
      <div className="flex justify-between items-end">
        <H1tag
          H1="Product Information"
          subHeading=""
          subPara="Manage your product details here."
        />
        <EntityDialog
          title="Add Product"
          TriggerButton={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          }
          FormComponent={ProductForm} 
          formProps={{ categories }}
        />
      </div>
      <ProductTable products={products} categories={categories} />
    </>
  );
}