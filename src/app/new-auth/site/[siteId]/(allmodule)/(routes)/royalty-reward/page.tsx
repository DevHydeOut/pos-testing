'use client';

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import H1tag from "@/components/text/h1";
import { RoyaltyRewardForm } from "@/components/modules/royalty-reward/royalty-reward";
import { RoyaltyRewardTable } from "@/components/modules/royalty-reward/royalty-reward-table";
import { searchProducts } from "@/actions/module/product";
import { getRoyaltyRewards } from "@/actions/module/royalty-reward";

interface RoyaltyRewardPageProps {
  params: Promise<{ siteId: string }>;
}

export default function RoyaltyRewardPage({ params }: RoyaltyRewardPageProps) {
  const { siteId } = use(params);
  const createdBy = ""; 

  const [open, setOpen] = useState(false);
  const [rewards, setRewards] = useState<Awaited<ReturnType<typeof getRoyaltyRewards>>>([]);

  const loadRewards = useCallback(async () => {
    const data = await getRoyaltyRewards(siteId);
    setRewards(data);
  }, [siteId]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleSearchProducts = async (query: string) => {
    return await searchProducts(siteId, query);
  };

  const handleClose = () => {
    setOpen(false);
    loadRewards(); // refresh table after create
  };

  return (
    <main className="container mx-auto">
      <div className="flex justify-between items-end mb-4">
        <H1tag
          H1="Royalty Reward"
          subHeading=""
          subPara="Manage your royalty rewards here."
        />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reward
        </Button>
      </div>

      <RoyaltyRewardTable
        rewards={rewards}
        siteId={siteId}
        createdBy={createdBy}
        onSearchProducts={handleSearchProducts}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Royalty Reward</DialogTitle>
          </DialogHeader>
          <RoyaltyRewardForm
            siteId={siteId}
            createdBy={createdBy}
            onClose={handleClose}
            onSearchProducts={handleSearchProducts}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}