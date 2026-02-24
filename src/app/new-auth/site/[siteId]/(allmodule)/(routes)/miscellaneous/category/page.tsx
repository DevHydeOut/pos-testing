"use server"

import H1tag from "@/components/text/h1";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { getAllCategories } from "@/actions/module/category";
import { CategoryTable } from "@/components/modules/category/category-table";
import { CategoryForm } from "@/components/modules/category/category-form";
import { EntityDialog } from "@/components/modules/common/EntityDialog";


export default async function CategoryPage() {
  const categories = await getAllCategories();

  return (
    <main className="container mx-auto">
      <div className="flex justify-between items-end">
        <H1tag 
          H1="Category Information"
          subHeading=""
          subPara="Manage your category details here."
        /> 
        <EntityDialog
          title="Add Category"
          TriggerButton={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          }
          formProps={{ categories}}
          FormComponent={CategoryForm}
        />
      </div>
      <CategoryTable categories={categories} />
    </main>
  );
}
