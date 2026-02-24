"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Percent, Hash, ChevronDown, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getSiteTaxConfig,
  updateSiteTaxProvince,
  updateTaxRegistrationNumbers,
  toggleSiteTax,
  overrideTaxRate,
} from "@/actions/module/tax-config";
import { CANADIAN_PROVINCES } from "@/lib/canada-tax";

interface Props {
  siteId: string;
}

// FIX: line 44 — replaced `any` with a proper interface matching SiteTaxConfig DB shape
interface TaxConfigData {
  isEnabled: boolean;
  provinceCode: string;
  provinceName: string;
  totalRate: number;
  gstRate: number;
  hstRate: number;
  pstRate: number;
  qstRate: number;
  gstNumber?: string | null;
  pstNumber?: string | null;
  qstNumber?: string | null;
}

const TAX_TYPE_LABELS: Record<string, string> = {
  HST:      "HST (Harmonized)",
  GST_PST:  "GST + PST",
  GST_QST:  "GST + QST",
  GST_ONLY: "GST only",
};

const TAX_TYPE_COLORS: Record<string, string> = {
  HST:      "bg-blue-50 text-blue-700 border-blue-200",
  GST_PST:  "bg-purple-50 text-purple-700 border-purple-200",
  GST_QST:  "bg-rose-50 text-rose-700 border-rose-200",
  GST_ONLY: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function TaxConfigForm({ siteId }: Props) {
  const [config, setConfig]             = useState<TaxConfigData | null>(null); // FIX: was `any`
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [success, setSuccess]           = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);

  const [selectedCode, setSelectedCode] = useState("ON");
  const previewProvince = CANADIAN_PROVINCES.find((p) => p.code === selectedCode);

  const [gstNumber, setGstNumber] = useState("");
  const [pstNumber, setPstNumber] = useState("");
  const [qstNumber, setQstNumber] = useState("");

  const [overrideGst, setOverrideGst] = useState("");
  const [overrideHst, setOverrideHst] = useState("");
  const [overridePst, setOverridePst] = useState("");
  const [overrideQst, setOverrideQst] = useState("");

  // FIX: line 63 — wrapped in useCallback so it's stable for the useEffect dep array
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSiteTaxConfig(siteId);
      if (data) {
        setConfig(data as TaxConfigData);
        setSelectedCode(data.provinceCode);
        setGstNumber(data.gstNumber ?? "");
        setPstNumber(data.pstNumber ?? "");
        setQstNumber(data.qstNumber ?? "");
        setOverrideGst(String(data.gstRate));
        setOverrideHst(String(data.hstRate));
        setOverridePst(String(data.pstRate));
        setOverrideQst(String(data.qstRate));
      }
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleSaveProvince = async () => {
    setSaving(true); setError(null);
    try {
      const result = await updateSiteTaxProvince(siteId, selectedCode);
      if (result.success) { await loadConfig(); showSuccessMsg(`Province updated to ${result.province?.name}`); }
      else setError(result.error ?? "Failed to update");
    } finally { setSaving(false); }
  };

  const handleSaveNumbers = async () => {
    setSaving(true); setError(null);
    try {
      const result = await updateTaxRegistrationNumbers(siteId, {
        gstNumber: gstNumber.trim() || undefined,
        pstNumber: pstNumber.trim() || undefined,
        qstNumber: qstNumber.trim() || undefined,
      });
      if (result.success) showSuccessMsg("Registration numbers saved");
      else setError(result.error ?? "Failed");
    } finally { setSaving(false); }
  };

  // FIX: line 115 — replaced `(c: any)` with typed updater using TaxConfigData
  const handleToggleTax = async (enabled: boolean) => {
    const result = await toggleSiteTax(siteId, enabled);
    if (result.success) {
      setConfig((prev) => prev ? { ...prev, isEnabled: enabled } : prev);
      showSuccessMsg(enabled ? "Tax enabled" : "Tax disabled for this store");
    }
  };

  const handleOverrideRates = async () => {
    setSaving(true); setError(null);
    try {
      const result = await overrideTaxRate(siteId, {
        gstRate: parseFloat(overrideGst) || 0,
        hstRate: parseFloat(overrideHst) || 0,
        pstRate: parseFloat(overridePst) || 0,
        qstRate: parseFloat(overrideQst) || 0,
      });
      if (result.success) { await loadConfig(); showSuccessMsg("Custom rates saved"); }
      else setError(result.error ?? "Failed");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground text-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading tax configuration...
      </div>
    );
  }

  // FIX: lines 161-163 — use ?? 0 so TS sees number (not number|undefined) in comparisons
  const taxTypeKey =
    (config?.gstRate ?? 0) > 0 && (config?.pstRate ?? 0) > 0 ? "GST_PST" :
    (config?.gstRate ?? 0) > 0 && (config?.qstRate ?? 0) > 0 ? "GST_QST" :
    (config?.hstRate ?? 0) > 0 ? "HST" : "GST_ONLY";

  return (
    <div className="space-y-4">

      {/* ── Feedback banners ── */}
      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-900/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2 text-green-800 dark:text-green-400">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════
          ROW 1 — Tax Status (left) | Current Config (right)
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT — Tax toggle */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tax Status</CardTitle>
            <CardDescription className="text-xs">
              Enable or disable sales tax collection for this store.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {config?.isEnabled ? "Tax collection is ON" : "Tax collection is OFF"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config?.isEnabled
                    ? "Tax is being applied to all sales."
                    : "No tax is being charged to customers."}
                </p>
              </div>
              <Switch
                id="tax-toggle"
                checked={config?.isEnabled ?? true}
                onCheckedChange={handleToggleTax}
              />
            </div>

            {/* Quick stats */}
            {config && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Total Rate</p>
                  <p className="text-2xl font-bold mt-0.5">{config.totalRate}%</p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Tax Type</p>
                  <Badge
                    variant="outline"
                    className={`mt-1.5 text-xs ${TAX_TYPE_COLORS[taxTypeKey]}`}
                  >
                    {config.hstRate > 0 ? "HST" : config.qstRate > 0 ? "GST+QST" : config.pstRate > 0 ? "GST+PST" : "GST"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — Current province summary */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Current Province
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Active tax configuration for this store.
                </CardDescription>
              </div>
              {config && (
                <Badge variant="outline" className={TAX_TYPE_COLORS[taxTypeKey]}>
                  {TAX_TYPE_LABELS[taxTypeKey]}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-3">
            {config ? (
              <>
                <p className="text-base font-semibold">
                  {config.provinceName}{" "}
                  <span className="text-muted-foreground font-normal text-sm">({config.provinceCode})</span>
                </p>

                {/* Rate breakdown boxes */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "GST", value: config.gstRate },
                    { label: "HST", value: config.hstRate },
                    { label: "PST", value: config.pstRate },
                    { label: "QST", value: config.qstRate },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className={`rounded-md border p-2 text-center ${r.value === 0 ? "opacity-30" : ""}`}
                    >
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <p className="text-sm font-bold mt-0.5">{r.value}%</p>
                    </div>
                  ))}
                </div>

                {/* Example on $100 */}
                <div className="rounded-lg bg-muted/30 border px-3 py-2.5 space-y-1 text-xs">
                  <p className="text-muted-foreground font-medium mb-1.5">Example on $100.00 sale:</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({config.totalRate}%)</span>
                    <span className="font-medium">${(100 * config.totalRate / 100).toFixed(2)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>Customer pays</span>
                    <span>${(100 + 100 * config.totalRate / 100).toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No config yet — select a province below.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          ROW 2 — Province Selector (left) | Registration Numbers (right)
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT — Province selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Change Province / Territory
            </CardTitle>
            <CardDescription className="text-xs">
              Tax rates are automatically loaded from Canadian tax law when you switch province.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CANADIAN_PROVINCES.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    <div className="flex items-center justify-between w-full gap-6">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="outline" className={`text-xs ml-auto ${TAX_TYPE_COLORS[p.taxType]}`}>
                        {p.totalRate}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Preview of selected province */}
            {previewProvince && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{previewProvince.name}</p>
                  <Badge variant="outline" className={`text-xs ${TAX_TYPE_COLORS[previewProvince.taxType]}`}>
                    {TAX_TYPE_LABELS[previewProvince.taxType]}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(["gstRate", "hstRate", "pstRate", "qstRate"] as const).map((key) => {
                    const labels = { gstRate: "GST", hstRate: "HST", pstRate: "PST", qstRate: "QST" };
                    const val = previewProvince[key];
                    return (
                      <div key={key} className={`rounded-md border p-2 text-center ${val === 0 ? "opacity-30" : ""}`}>
                        <p className="text-xs text-muted-foreground">{labels[key]}</p>
                        <p className="text-sm font-bold mt-0.5">{val}%</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <p>{previewProvince.notes}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveProvince}
              disabled={saving || selectedCode === config?.provinceCode}
              className="w-full"
            >
              {saving
                ? "Saving..."
                : selectedCode === config?.provinceCode
                  ? "Province already set"
                  : `Save — Switch to ${previewProvince?.name}`}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT — Registration numbers */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Tax Registration Numbers
            </CardTitle>
            <CardDescription className="text-xs">
              Required on Canadian receipts over $30. These print on every bill automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {(config?.hstRate ?? 0) > 0 ? "HST" : "GST"} Registration Number
                  <span className="text-muted-foreground ml-1">(federal)</span>
                </Label>
                <Input
                  placeholder="e.g. 123456789 RT0001"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              {(config?.pstRate ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">PST Registration Number</Label>
                  <Input
                    placeholder="Province-specific format"
                    value={pstNumber}
                    onChange={(e) => setPstNumber(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}

              {(config?.qstRate ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">QST Registration Number</Label>
                  <Input
                    placeholder="e.g. 1234567890 TQ0001"
                    value={qstNumber}
                    onChange={(e) => setQstNumber(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/30 border px-3 py-2.5 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <p>
                  Your GST/HST number must appear on all receipts issued to businesses and on
                  receipts over $30. Failure to display it may result in CRA penalties.
                </p>
              </div>
            </div>

            <Button variant="outline" onClick={handleSaveNumbers} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Registration Numbers"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          ROW 3 — Custom Rate Override (full width, collapsible)
      ══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Custom Rate Override
              </CardTitle>
              <CardDescription className="text-xs">
                Only use this if your rates differ from standard Canadian rates (e.g. special exemptions).
              </CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-xs gap-1.5"
              onClick={() => setShowOverride((o) => !o)}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOverride ? "rotate-180" : ""}`} />
              {showOverride ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>

        {showOverride && (
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT — rate inputs */}
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="ml-2 text-xs">
                    Overriding rates does not change your province — only the percentages applied at billing.
                    Reset by re-selecting your province above.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "GST %", value: overrideGst, set: setOverrideGst },
                    { label: "HST %", value: overrideHst, set: setOverrideHst },
                    { label: "PST %", value: overridePst, set: setOverridePst },
                    { label: "QST %", value: overrideQst, set: setOverrideQst },
                  ].map((f) => (
                    <div key={f.label} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type="number" min={0} max={30} step={0.01}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="h-9 text-sm text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — preview + save */}
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Custom rate preview</p>

                  {[
                    { label: "GST", value: parseFloat(overrideGst) || 0 },
                    { label: "HST", value: parseFloat(overrideHst) || 0 },
                    { label: "PST", value: parseFloat(overridePst) || 0 },
                    { label: "QST", value: parseFloat(overrideQst) || 0 },
                  ].map((r) => (
                    <div key={r.label} className={`flex justify-between text-xs ${r.value === 0 ? "opacity-30" : ""}`}>
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-medium">{r.value.toFixed(2)}%</span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between text-sm font-bold">
                    <span>Custom total</span>
                    <span>
                      {(
                        (parseFloat(overrideGst) || 0) +
                        (parseFloat(overrideHst) || 0) +
                        (parseFloat(overridePst) || 0) +
                        (parseFloat(overrideQst) || 0)
                      ).toFixed(3)}%
                    </span>
                  </div>

                  <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs space-y-1">
                    <p className="text-muted-foreground">Example on $100.00:</p>
                    <div className="flex justify-between font-semibold">
                      <span>Customer pays</span>
                      <span>
                        ${(100 + (
                          (parseFloat(overrideGst) || 0) +
                          (parseFloat(overrideHst) || 0) +
                          (parseFloat(overridePst) || 0) +
                          (parseFloat(overrideQst) || 0)
                        )).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleOverrideRates}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Apply Custom Rates"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}