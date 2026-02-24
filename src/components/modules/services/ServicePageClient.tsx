// components/modules/services/service-page-client.tsx
"use client";

import { Category, Service } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import H1tag from "@/components/text/h1";
import { EntityDialog } from "@/components/modules/common/EntityDialog";
import { ServiceForm } from "./service-form";
import { ServiceTable } from "./service-table";

interface Props {
  categories: Category[];
  services: Service[];
}

export function ServicePageClient({ categories, services }: Props) {

  return (
    <>
      <div className="flex justify-between items-end">
        <H1tag 
          H1="Service Information"
          subHeading=""
          subPara="Manage your service details here."
        /> 

        <EntityDialog
          title="Add Service"
          TriggerButton={<Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Service
          </Button>}
          FormComponent={({ onClose }) => (
            <ServiceForm categories={categories} onClose={onClose} />
          )} formProps={undefined}        />
      </div>

      <ServiceTable 
        services={services.map(service => ({
          ...service,
          category: categories.find(category => category.id === service.categoryId) || {} as Category,
        }))} 
        categories={categories} 
      />
    </>
  );
}
