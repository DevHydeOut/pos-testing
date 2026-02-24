"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, Eye, FileText, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Printer, Edit, History, AlertCircle, CheckCircle2, Banknote, CreditCard, Smartphone, Landmark, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { getAllSales, getSaleById, updateSale } from "@/actions/module/billing";
import BillPrintManager from "@/components/modules/billing/bill-print";
import { EditBillModal, type UpdatedSale } from "@/components/modules/billing/edit-bill-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL" | "REFUNDED";

interface Sale {
  id: string;
  billNo: string;
  billType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  patient?: { uhid: string; name: string; phone: string } | null;
  paymentStatus: PaymentStatus;
  createdAt: Date | string;
  isEdited?: boolean;
  netAmount: number;
  dueAmount: number;
  paidAmount: number;
  items: { productName: string; quantity: number; totalAmount: number }[];
}

// FIX: line 74, 168, 180, 526 — typed selected sale details returned by getSaleById
interface SaleDetail {
  id: string;
  billNo: string;
  billType: string;
  createdAt: Date | string;
  editedAt?: Date | string | null;
  isEdited?: boolean;
  editReason?: string | null;
  remark?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  grossAmount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  patient?: { uhid: string; name: string; phone: string } | null;
  items: SaleDetailItem[];
}

interface SaleDetailItem {
  id?: string;
  productName: string;
  batchNumber?: string | null;
  quantity: number;
  mrp?: number;
  saleRate: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

const paymentStatusColors: Record<PaymentStatus, string> = {
  PAID:     "bg-green-50  text-green-700  border-green-200",
  UNPAID:   "bg-red-50    text-red-700    border-red-200",
  PARTIAL:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  REFUNDED: "bg-purple-50 text-purple-700 border-purple-200",
};

const paymentMethodIcon: Record<string, React.ReactNode> = {
  CASH:       <Banknote   className="h-3.5 w-3.5" />,
  CARD:       <CreditCard className="h-3.5 w-3.5" />,
  UPI:        <Smartphone className="h-3.5 w-3.5" />,
  NETBANKING: <Landmark   className="h-3.5 w-3.5" />,
  ONLINE:     <Globe      className="h-3.5 w-3.5" />,
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtAmount(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingListPage() {
  const [sales, setSales]               = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null); // FIX: was `any`
  const [viewModalOpen, setViewModalOpen]   = useState(false);
  const [editModalOpen, setEditModalOpen]   = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm]               = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");

  // Stats
  const [stats, setStats] = useState({ total: 0, revenue: 0, due: 0, paid: 0 });

  // ── Load ──
  // FIX: line 95 — wrapped in useCallback so it's stable and safe in useEffect deps
  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllSales();
      setSales(data);
      setFilteredSales(data);
      calcStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSales(); }, [loadSales]);

  const calcStats = (data: Sale[]) => setStats({
    total:   data.length,
    revenue: data.reduce((s, x) => s + x.netAmount, 0),
    due:     data.reduce((s, x) => s + x.dueAmount, 0),
    paid:    data.filter((x) => x.paymentStatus === "PAID").length,
  });

  // ── Filtering ──
  useEffect(() => {
    let f = [...sales];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter((s) =>
        s.billNo.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerPhone?.includes(searchTerm) ||
        s.patient?.name.toLowerCase().includes(q) ||
        s.patient?.uhid.toLowerCase().includes(q) ||
        s.patient?.phone.includes(searchTerm)
      );
    }
    if (paymentStatusFilter !== "ALL") f = f.filter((s) => s.paymentStatus === paymentStatusFilter);
    if (startDate) { const d = new Date(startDate); d.setHours(0,0,0,0); f = f.filter((s) => new Date(s.createdAt) >= d); }
    if (endDate)   { const d = new Date(endDate);   d.setHours(23,59,59,999); f = f.filter((s) => new Date(s.createdAt) <= d); }
    setFilteredSales(f);
    calcStats(f);
    setCurrentPage(1);
  }, [searchTerm, paymentStatusFilter, startDate, endDate, sales]);

  // ── Pagination ──
  const totalPages  = Math.ceil(filteredSales.length / itemsPerPage);
  const startIdx    = (currentPage - 1) * itemsPerPage;
  const currentRows = filteredSales.slice(startIdx, startIdx + itemsPerPage);

  // ── Handlers ──
  const handleView = async (id: string) => {
    const details = await getSaleById(id) as SaleDetail; // FIX: line 168 — cast from `any`
    setSelectedSale(details);
    setViewModalOpen(true);
  };

  const handleEdit = async (id: string) => {
    const details = await getSaleById(id) as SaleDetail; // FIX: line 168 — cast from `any`
    setSelectedSale(details);
    setEditModalOpen(true);
  };

  const handlePrint = async (id: string) => {
    const details = await getSaleById(id) as SaleDetail; // FIX: line 168 — cast from `any`
    setSelectedSale(details);
    setViewModalOpen(false);
    setPrintModalOpen(true);
  };

    const handleSaveEdit = async (updated: UpdatedSale) => {
      const result = await updateSale({
        ...updated,
        items: updated.items.map((item) => ({
          ...item,
          id: item.id ?? "",
        })),
      });
    if (result.success) {
      setSuccessMsg(`Bill ${selectedSale?.billNo} updated successfully`);
      setEditModalOpen(false);
      await loadSales();
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(result.error || "Failed to update bill");
    }
  };

  const convertToPrint = (sale: SaleDetail) => ({
    billNo:          sale.billNo,
    billType:        sale.billType,
    createdAt:       sale.createdAt,
    customerName:    sale.patient?.name || sale.customerName || "Customer",
    customerPhone: (sale.patient?.phone || sale.customerPhone) ?? undefined,
    customerAddress: sale.customerAddress ?? undefined,
    patientUHID:     sale.patient?.uhid,
    items:           sale.items?.map((item) => ({
      ...item,
      batchNumber: item.batchNumber ?? undefined,
    })) || [],
    grossAmount:     sale.grossAmount,
    discount:        sale.discount,
    netAmount:       sale.netAmount,
    paidAmount:      sale.paidAmount,
    dueAmount:       sale.dueAmount,
    paymentStatus:   sale.paymentStatus,
    remark:          sale.remark ?? undefined,
    payments:        [{ method: "CASH", amount: sale.paidAmount }],
  });

  const clearFilters = () => {
    setSearchTerm(""); setPaymentStatusFilter("ALL"); setStartDate(""); setEndDate("");
  };
  const hasFilters = searchTerm || paymentStatusFilter !== "ALL" || startDate || endDate;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">

      {/* Messages */}
      {successMsg && (
        <Alert className="border-green-500 bg-green-50 relative">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2 text-green-800">{successMsg}</AlertDescription>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-6 w-6" onClick={() => setSuccessMsg(null)}><X className="h-3 w-3" /></Button>
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{errorMsg}</AlertDescription>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-6 w-6" onClick={() => setErrorMsg(null)}><X className="h-3 w-3" /></Button>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing History</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all sales transactions</p>
        </div>
        <Button onClick={loadSales} variant="outline" size="sm" className="gap-2">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Bills",    value: stats.total,                      sub: "All records",        accent: "border-l-blue-500",   icon: <FileText className="h-5 w-5 text-blue-600" />,   iconBg: "bg-blue-50" },
          { label: "Total Revenue",  value: `₹${fmtAmount(stats.revenue)}`,   sub: "Gross collection",   accent: "border-l-emerald-500", icon: <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: "bg-emerald-50" },
          { label: "Total Due",      value: `₹${fmtAmount(stats.due)}`,       sub: "Pending payments",   accent: "border-l-orange-500",  icon: <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: "bg-orange-50" },
          { label: "Paid Bills",     value: stats.paid,                       sub: `${stats.total > 0 ? Math.round((stats.paid/stats.total)*100) : 0}% completion`, accent: "border-l-purple-500", icon: <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: "bg-purple-50" },
        ].map((s) => (
          <Card key={s.label} className={`p-4 border-l-4 ${s.accent}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.iconBg}`}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Bill No, name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-sm" />
          <Input type="date" value={endDate}   onChange={(e) => setEndDate(e.target.value)}   className="h-9 text-sm" />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <p className="text-sm font-semibold">
            Bills <span className="text-muted-foreground font-normal">({filteredSales.length})</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show</span>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading bills...
          </div>
        ) : currentRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No bills found</p>
            <p className="text-xs text-muted-foreground/60">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium w-10">#</th>
                    <th className="px-3 py-3 text-left font-medium">Bill No</th>
                    <th className="px-3 py-3 text-left font-medium">Date & Time</th>
                    <th className="px-3 py-3 text-left font-medium">Customer</th>
                    <th className="px-3 py-3 text-right font-medium">Items</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-right font-medium">Due</th>
                    <th className="px-3 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentRows.map((sale, idx) => (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{startIdx + idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-xs">{sale.billNo}</span>
                          {sale.isEdited && (
                            <Badge variant="outline" className="text-xs py-0 h-4 gap-0.5 bg-amber-50 text-amber-700 border-amber-200">
                              <History className="h-2.5 w-2.5" /> Edited
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-xs">{fmtDate(sale.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">{fmtTime(sale.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-xs truncate max-w-[140px]">
                          {sale.patient?.name || sale.customerName || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.patient?.phone || sale.customerPhone || ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Badge variant="secondary" className="text-xs">{sale.items.length}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-xs">
                        ₹{fmtAmount(sale.netAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        <span className={sale.dueAmount > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          ₹{fmtAmount(sale.dueAmount)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={`text-xs ${paymentStatusColors[sale.paymentStatus]}`}>
                          {sale.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(sale.id)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(sale.id)} title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrint(sale.id)} title="Print">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredSales.length)} of {filteredSales.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = totalPages <= 5 ? i + 1
                    : currentPage <= 3 ? i + 1
                    : currentPage >= totalPages - 2 ? totalPages - 4 + i
                    : currentPage - 2 + i;
                  return (
                    <Button key={page} variant={currentPage === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── View Modal ─────────────────────────────────────────── */}
      {viewModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Bill Details</p>
                  <p className="text-xs text-muted-foreground font-mono">#{selectedSale.billNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handlePrint(selectedSale.id)}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => { setViewModalOpen(false); handleEdit(selectedSale.id); }}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Meta row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border">
                {[
                  { label: "Bill Number", val: <span className="font-mono font-bold">{selectedSale.billNo}</span> },
                  { label: "Date & Time", val: <><p className="font-medium text-sm">{fmtDate(selectedSale.createdAt)}</p><p className="text-xs text-muted-foreground">{fmtTime(selectedSale.createdAt)}</p></> },
                  { label: "Payment Method", val: <div className="flex items-center gap-1.5 text-sm font-medium">{paymentMethodIcon[selectedSale.paymentMethod ?? "CASH"] ?? <Banknote className="h-3.5 w-3.5" />}{selectedSale.paymentMethod ?? "CASH"}</div> },
                  { label: "Status", val: <Badge variant="outline" className={paymentStatusColors[selectedSale.paymentStatus as PaymentStatus]}>{selectedSale.paymentStatus}</Badge> },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    {item.val}
                  </div>
                ))}
              </div>

              {/* Customer */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                    <p className="font-medium">{selectedSale.patient?.name || selectedSale.customerName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-medium">{selectedSale.patient?.phone || selectedSale.customerPhone || "—"}</p>
                  </div>
                  {selectedSale.patient?.uhid && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">UHID</p>
                      <p className="font-mono font-medium">{selectedSale.patient.uhid}</p>
                    </div>
                  )}
                </div>
                {selectedSale.customerAddress && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                    <p>{selectedSale.customerAddress}</p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Items ({selectedSale.items?.length || 0})
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/20">
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
                      <th className="px-3 py-2.5 text-left font-medium">Product</th>
                      <th className="px-3 py-2.5 text-left font-medium">Batch</th>
                      <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                      <th className="px-3 py-2.5 text-right font-medium">MRP</th>
                      <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                      <th className="px-3 py-2.5 text-right font-medium">Disc.</th>
                      <th className="px-3 py-2.5 text-right font-medium">Tax</th>
                      <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* FIX: line 526 — was `(item: any, i: number)` */}
                    {selectedSale.items?.map((item: SaleDetailItem, i: number) => (
                      <tr key={item.id || i} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{item.productName}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{item.batchNumber || "—"}</td>
                        <td className="px-3 py-2.5 text-right"><Badge variant="secondary" className="text-xs">{item.quantity}</Badge></td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">₹{item.mrp?.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">₹{item.saleRate?.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-destructive/70">₹{item.discount?.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">₹{item.taxAmount?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₹{item.totalAmount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bill summary + remark row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Summary */}
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Summary</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross</span><span>₹{selectedSale.grossAmount?.toFixed(2)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-destructive/80">
                      <span>Discount</span><span>−₹{selectedSale.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Net Total</span><span>₹{selectedSale.netAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid</span>
                    <span className="text-green-600 font-medium">₹{selectedSale.paidAmount?.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-1 border-t ${selectedSale.dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
                    <span>Due</span><span>₹{selectedSale.dueAmount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Remark + edit history */}
                <div className="space-y-3">
                  {selectedSale.remark && (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Note</p>
                      <p className="text-sm">{selectedSale.remark}</p>
                    </div>
                  )}
                  {selectedSale.isEdited && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <History className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Bill was edited</p>
                      </div>
                      {selectedSale.editReason && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">Reason: {selectedSale.editReason}</p>
                      )}
                      {selectedSale.editedAt && (
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(selectedSale.editedAt)} at {fmtTime(selectedSale.editedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedSale && (
        <EditBillModal
          sale={selectedSale}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSave={handleSaveEdit}
        />
      )}

      {/* Print Modal */}
      {selectedSale && (
        <BillPrintManager
          billData={convertToPrint(selectedSale)}
          open={printModalOpen}
          onOpenChange={setPrintModalOpen}
        />
      )}
    </div>
  );
}