// app/(allmodule)/(routes)/miscellaneous/service/page.tsx
"use server";

import { getAllCategories } from "@/actions/module/category";
import { getAllServices } from "@/actions/module/service";
import { ServicePageClient } from "@/components/modules/services/ServicePageClient";

export default async function ServicePage() {
  const categories = await getAllCategories();
  const services = await getAllServices();

  return (
    <main className="container mx-auto">
      <ServicePageClient categories={categories} services={services} />
    </main>
  );
}
