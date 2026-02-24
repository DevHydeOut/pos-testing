"use client";

import { useParams } from "next/navigation";
import H1tag from "@/components/text/h1";
import TaxConfigForm from "@/components/settings/tax-config-form";

export default function TaxPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  return (
    <main className="container mx-auto">
      <div className="flex justify-between items-end">
        <H1tag 
          H1="Tax System Configuration"
          subHeading=""
          subPara="Manage your tax configurations here."
        /> 
      </div>
      <TaxConfigForm siteId={siteId} />
    </main>
  );
}