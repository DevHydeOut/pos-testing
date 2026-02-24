// app/(allmodule)/(routes)/miscellaneous/product/page.tsx
import { getAllCategories } from "@/actions/module/category";
import { getAllProducts } from "@/actions/module/product";
import { ProductPageClient } from "@/components/modules/product/productPageClient";

export default async function ProductPage() {
  const allCategories = await getAllCategories();
  const productCategories = allCategories.filter((cat) => cat.type === "PRODUCT");
  const products = await getAllProducts();

  return (
    <main className="container mx-auto">
      <ProductPageClient
        categories={productCategories}
        products={products}
      />
    </main>
  );
}