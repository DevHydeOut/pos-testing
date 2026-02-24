"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Search, Trash2, Tag, Package, PowerOff, Power } from "lucide-react";
import { RoyaltyReward, RewardType, RewardStatus } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EntityEditDialog } from "@/components/modules/common/EntityEditDialog";
import { DeleteAlertDialog } from "@/components/modules/common/DeleteAlertDialog";
import { RoyaltyRewardForm } from "./royalty-reward";
import { deleteRoyaltyReward, toggleRoyaltyRewardStatus } from "@/actions/module/royalty-reward";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoyaltyRewardWithProduct extends RoyaltyReward {
  product?: { id: string; name: string; currentStock: number } | null;
}

interface ProductSearchResult {
  id: string;
  name: string;
  shortName: string;
  currentStock: number;
}

interface Props {
  rewards: RoyaltyRewardWithProduct[];
  siteId: string;
  createdBy: string;
  onSearchProducts: (query: string) => Promise<ProductSearchResult[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

function RewardTypeBadge({ type }: { type: RewardType }) {
  return type === "DISCOUNT" ? (
    <Badge variant="secondary" className="gap-1 text-blue-700 bg-blue-100">
      <Tag className="h-3 w-3" />
      Discount
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100">
      <Package className="h-3 w-3" />
      Product
    </Badge>
  );
}

function StatusBadge({ status }: { status: RewardStatus }) {
  return status === "ACTIVE" ? (
    <Badge variant="secondary" className="text-emerald-700 bg-emerald-100">Active</Badge>
  ) : (
    <Badge variant="secondary" className="text-gray-500 bg-gray-100">Inactive</Badge>
  );
}

function RewardDetails({ reward }: { reward: RoyaltyRewardWithProduct }) {
  if (reward.rewardType === "DISCOUNT") {
    return (
      <div className="text-sm">
        <span className="font-medium">{reward.couponName}</span>
        <span className="text-muted-foreground ml-1">
          — {reward.discountPercent}% off
          {reward.discountMaxCap ? ` (max $${reward.discountMaxCap})` : ""}
        </span>
      </div>
    );
  }
  return (
    <div className="text-sm">
      <span className="font-medium">{reward.product?.name ?? "—"}</span>
      <span className="text-muted-foreground ml-1">
        × {reward.productQty} unit{(reward.productQty ?? 1) > 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoyaltyRewardTable({ rewards, siteId, createdBy, onSearchProducts }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [page, setPage] = useState(1);

  // ── Filter ──
  const filtered = rewards.filter((r) => {
    const matchQuery =
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.couponName?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (r.product?.name.toLowerCase().includes(query.toLowerCase()) ?? false);

    const matchType = typeFilter === "__all__" ? true : r.rewardType === typeFilter;
    const matchStatus = statusFilter === "__all__" ? true : r.status === statusFilter;

    return matchQuery && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Delete ──
  const handleDelete = async (id: string) => {
    try {
      const res = await deleteRoyaltyReward(id);
      if ("error" in res) {
        toast.error(res.error?.message ?? "Failed to delete reward.");
      } else {
        toast.success("Reward deleted successfully.");
      }
    } catch {
      toast.error("Cannot delete reward. It may be in use.");
    }
  };

  // ── Toggle Status ──
  const handleToggle = async (id: string, currentStatus: RewardStatus) => {
    try {
      const res = await toggleRoyaltyRewardStatus(id);
      if ("error" in res) {
        toast.error(res.error?.message ?? "Failed to update status.");
      } else {
        toast.success(
          currentStatus === "ACTIVE" ? "Reward deactivated." : "Reward activated."
        );
      }
    } catch {
      toast.error("Failed to update reward status.");
    }
  };

  return (
    <div className="space-y-4 mt-12">

      {/* ── Search & Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, coupon or product..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => { setTypeFilter(v); setPage(1); }} value={typeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              <SelectItem value="DISCOUNT">Discount</SelectItem>
              <SelectItem value="PRODUCT">Product</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => { setStatusFilter(v); setPage(1); }} value={statusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="border rounded-md overflow-x-auto px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S. No.</TableHead>
              <TableHead>Reward Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Points Required</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((reward, index) => (
                <TableRow key={reward.id}>
                  <TableCell>{(page - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell className="font-medium">{reward.name}</TableCell>
                  <TableCell><RewardTypeBadge type={reward.rewardType} /></TableCell>
                  <TableCell><RewardDetails reward={reward} /></TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{reward.pointsRequired}</span>
                    <span className="text-muted-foreground text-xs ml-1">pts</span>
                  </TableCell>
                  <TableCell><StatusBadge status={reward.status} /></TableCell>
                  <TableCell>{format(new Date(reward.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">

                      {/* Edit */}
                      <EntityEditDialog
                        title="Edit Reward"
                        initialData={{
                          id: reward.id,
                          name: reward.name,
                          rewardType: reward.rewardType,
                          pointsRequired: reward.pointsRequired,
                          couponName: reward.couponName,
                          discountPercent: reward.discountPercent,
                          discountMaxCap: reward.discountMaxCap,
                          productId: reward.productId,
                          productName: reward.product?.name,
                          productQty: reward.productQty,
                        }}
                        TriggerButton={
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        FormComponent={({ onClose, initialData }) => (
                          <RoyaltyRewardForm
                            siteId={siteId}
                            createdBy={createdBy}
                            onClose={onClose}
                            onSearchProducts={onSearchProducts}
                            initialData={initialData}
                          />
                        )}
                      />

                      {/* Toggle Status */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggle(reward.id, reward.status)}
                        title={reward.status === "ACTIVE" ? "Deactivate reward" : "Activate reward"}
                      >
                        {reward.status === "ACTIVE" ? (
                          <PowerOff className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Power className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>

                      {/* Delete */}
                      <DeleteAlertDialog
                        title="Delete Reward"
                        description={`Are you sure you want to delete "${reward.name}"? This action cannot be undone.`}
                        onConfirm={() => handleDelete(reward.id)}
                        TriggerElement={
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No rewards found. Create your first reward using the button above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}