"use client";

/**
 * InteractiveDemo — pixel-accurate replica of the real sync builder portal UI.
 * Copied directly from:
 *   - src/app/(portal)/syncs/new/page.tsx  (StepBar, OrgObjectSelector, triggers step, fields step, review step)
 *   - src/app/(portal)/syncs/page.tsx       (sync card)
 *
 * Every className, component, and layout is taken verbatim from the real pages.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Building2, ArrowLeftRight,
  Filter, Loader2, Plus, Trash2, Zap, Sparkles, AlertTriangle,
  CheckCircle2, ChevronRight, ChevronDown, FlaskConical, ShieldCheck,
  XCircle, Power, PauseCircle, RefreshCw, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Step config (copied from new/page.tsx) ────────────────────────────────────

const STEPS = [
  { id: 1, label: "Source Org" },
  { id: 2, label: "Target Org" },
  { id: 3, label: "Direction & Triggers" },
  { id: 4, label: "Filters" },
  { id: 5, label: "Fields" },
  { id: 6, label: "Review & Save" },
];

// ─── StepBar (copied verbatim from new/page.tsx line 161) ─────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all",
            current === step.id ? "gradient-bg text-white shadow-lg shadow-primary/25" :
            current > step.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {current > step.id ? <Check className="h-4 w-4" /> : step.id}
          </div>
          <span className={cn(
            "ml-2 text-sm font-medium hidden sm:block",
            current === step.id ? "text-foreground" : "text-muted-foreground"
          )}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("mx-3 flex-1 h-px", current > step.id ? "bg-primary/30" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 & 2: Org + Object selector (copied from OrgObjectSelector) ─────────

const MOCK_ORGS = [
  { id: "prod",    label: "Acme Corp — Production", is_sandbox: false },
  { id: "sandbox", label: "Acme Corp — Sandbox",    is_sandbox: true  },
];

const MOCK_OBJECTS = [
  { id: "1", api_name: "Account",     label: "Account",     is_custom: false },
  { id: "2", api_name: "Contact",     label: "Contact",     is_custom: false },
  { id: "3", api_name: "Lead",        label: "Lead",        is_custom: false },
  { id: "4", api_name: "Opportunity", label: "Opportunity", is_custom: false },
  { id: "5", api_name: "Case",        label: "Case",        is_custom: false },
];

function OrgObjectSelector({
  label, selectedOrgId, onOrgSelect, selectedObject, onObjectSelect, disabledOrgId,
}: {
  label: string;
  selectedOrgId: string;
  onOrgSelect: (id: string) => void;
  selectedObject: string;
  onObjectSelect: (v: string) => void;
  disabledOrgId?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">{label} Org</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MOCK_ORGS.map((org) => (
            <button
              key={org.id}
              onClick={() => onOrgSelect(org.id)}
              disabled={org.id === disabledOrgId}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                selectedOrgId === org.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-primary/40 hover:bg-muted/50",
                org.id === disabledOrgId && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                selectedOrgId === org.id ? "gradient-bg" : "bg-muted"
              )}>
                <Building2 className={cn("h-4 w-4", selectedOrgId === org.id ? "text-white" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{org.label}</p>
                <p className="text-xs text-muted-foreground">{org.is_sandbox ? "Sandbox" : "Production"}</p>
              </div>
              {selectedOrgId === org.id && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {selectedOrgId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">{label} Object</Label>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
              <RefreshCw className="h-3 w-3" />Sync Metadata
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border divide-y">
            {MOCK_OBJECTS.map((obj) => (
              <button
                key={obj.id}
                onClick={() => onObjectSelect(obj.api_name)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
                  selectedObject === obj.api_name ? "bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{obj.label}</span>
                  <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">{obj.api_name}</span>
                </div>
                {selectedObject === obj.api_name && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Direction & Triggers (copied verbatim from case 3) ────────────────

function DirectionTriggersStep({
  direction, triggers, sourceLabel, targetLabel,
  onDirection, onTrigger,
}: {
  direction: "one_way" | "bidirectional";
  triggers: { create: boolean; update: boolean; delete: boolean };
  sourceLabel: string; targetLabel: string;
  onDirection: (v: "one_way" | "bidirectional") => void;
  onTrigger: (k: "create" | "update" | "delete") => void;
}) {
  const opts = [
    { value: "one_way" as const,       label: "One-Way",       desc: `${sourceLabel} → ${targetLabel}` },
    { value: "bidirectional" as const, label: "Bidirectional", desc: "Changes in either org sync to the other" },
  ];
  const triggerOpts = [
    { key: "create" as const, label: "Record Created", desc: "New record in source org" },
    { key: "update" as const, label: "Record Updated", desc: "Field changes in source org" },
    { key: "delete" as const, label: "Record Deleted", desc: "Record removed from source org" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">Sync Direction</Label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {opts.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDirection(opt.value)}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                direction === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <ArrowLeftRight className={cn("mt-0.5 h-4 w-4 shrink-0", direction === opt.value ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1">
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {direction === opt.value && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Trigger On</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Which record events should trigger a sync</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {triggerOpts.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onTrigger(opt.key)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                triggers[opt.key] ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <Zap className={cn("h-4 w-4", triggers[opt.key] ? "text-primary" : "text-muted-foreground")} />
                {triggers[opt.key] && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="font-medium text-sm mt-2">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Filters (layout copied verbatim from case 5 in new/page.tsx) ──────

const MOCK_SOURCE_FIELDS = [
  { api_name: "Name",          label: "Account Name",   field_type: "string",   picklist_values: [] },
  { api_name: "Industry",      label: "Industry",       field_type: "picklist", picklist_values: [
    { value: "Technology",    label: "Technology" },
    { value: "Finance",       label: "Finance" },
    { value: "Healthcare",    label: "Healthcare" },
    { value: "Manufacturing", label: "Manufacturing" },
    { value: "Retail",        label: "Retail" },
    { value: "Energy",        label: "Energy" },
  ]},
  { api_name: "AnnualRevenue", label: "Annual Revenue", field_type: "currency", picklist_values: [] },
  { api_name: "BillingCity",   label: "Billing City",   field_type: "string",   picklist_values: [] },
  { api_name: "Rating",        label: "Rating",         field_type: "picklist", picklist_values: [
    { value: "Hot",  label: "Hot" },
    { value: "Warm", label: "Warm" },
    { value: "Cold", label: "Cold" },
  ]},
];

const FILTER_OPERATORS = ["=", "!=", "contains", "starts with", "is empty", "is not empty"];

interface FilterRule { id: string; field: string; operator: string; value: string; }

function FiltersStep({ filters, onAdd, onRemove, onUpdate }: {
  filters: FilterRule[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: keyof FilterRule, value: string) => void;
}) {
  if (filters.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Only sync records that match ALL of these conditions. Leave empty to sync all records.
        </p>
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Filter className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No filters — all records will sync</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a filter to restrict which records get synced</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Filter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Only sync records that match ALL of these conditions.</p>
      {filters.map((f, i) => {
        const selectedField = MOCK_SOURCE_FIELDS.find(x => x.api_name === f.field);
        const isPicklist = selectedField?.field_type === "picklist" || selectedField?.field_type === "multipicklist";
        const picklistOptions = selectedField?.picklist_values ?? [];
        const showValue = !["is empty", "is not empty"].includes(f.operator);
        return (
          <div key={f.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground w-8">{i === 0 ? "IF" : "AND"}</span>
            <div className="relative">
              <select
                value={f.field}
                onChange={(e) => { onUpdate(f.id, "field", e.target.value); onUpdate(f.id, "value", ""); }}
                className="h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {MOCK_SOURCE_FIELDS.map(x => <option key={x.api_name} value={x.api_name}>{x.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={f.operator}
                onChange={(e) => onUpdate(f.id, "operator", e.target.value)}
                className="h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {FILTER_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            {showValue && (
              isPicklist && picklistOptions.length > 0 ? (
                <div className="relative">
                  <select
                    value={f.value}
                    onChange={(e) => onUpdate(f.id, "value", e.target.value)}
                    className="h-9 w-44 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">— select value —</option>
                    {picklistOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              ) : (
                <input
                  value={f.value}
                  onChange={(e) => onUpdate(f.id, "value", e.target.value)}
                  placeholder="Value"
                  className="h-9 w-40 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => onRemove(f.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />Add Condition
      </Button>
    </div>
  );
}

// ─── Step 5: Fields (layout copied verbatim from case 6 in new/page.tsx) ───────

const ALL_SELECTABLE_FIELDS = [
  { api_name: "Name",          label: "Account Name" },
  { api_name: "Phone",         label: "Phone" },
  { api_name: "Industry",      label: "Industry" },
  { api_name: "AnnualRevenue", label: "Annual Revenue" },
  { api_name: "BillingCity",   label: "Billing City" },
  { api_name: "BillingState",  label: "Billing State" },
  { api_name: "Website",       label: "Website" },
  { api_name: "Description",   label: "Description" },
];

interface FieldMapping { source_field: string; target_field: string; }

// Simulated AI results per row
const MOCK_AI_RESULTS: Record<string, { status: "ok" | "warning" | "error"; message: string }> = {
  "Name→Name":                { status: "ok",      message: "Compatible — string → string" },
  "Phone→Phone":              { status: "ok",      message: "Compatible — phone → phone" },
  "Industry→Industry":        { status: "ok",      message: "Compatible — picklist values match" },
  "AnnualRevenue→AnnualRevenue": { status: "warning", message: "Currency — rounding may differ between orgs" },
};

function FieldsStep({ mappings, onRemove, onUpdate, onAdd, onAnalyze, analyzing, aiRan }: {
  mappings: FieldMapping[];
  onRemove: (i: number) => void;
  onUpdate: (i: number, side: "source_field" | "target_field", val: string) => void;
  onAdd: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  aiRan: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Tracking field banner — copied from real step 6 */}
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
        <span>
          <span className="font-mono font-semibold">OrgSync_Source_Id__c</span> is ready on{" "}
          <span className="font-semibold">Account</span> in Acme Sandbox — records will update correctly, no duplicates.
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map source fields to target fields. Fields with matching API names were auto-matched.
        </p>
        {mappings.length > 0 && (
          <Button
            variant="outline" size="sm"
            onClick={onAnalyze} disabled={analyzing}
            className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
          >
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Analyze with AI
          </Button>
        )}
      </div>

      {/* AI analysis panel — shown after analyzing */}
      {aiRan && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Analysis</span>
            </div>
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm">4 mappings look compatible. AnnualRevenue is a currency field — rounding behavior may differ between orgs.</p>
          </div>
        </div>
      )}

      {/* Field mapping grid — exact grid-cols-[1fr_auto_1fr_auto_auto] from real page */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-x-3 gap-y-3 items-center">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source Field</div>
        <div />
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Field</div>
        <div />
        <div />

        {mappings.map((m, i) => {
          const key = `${m.source_field}→${m.target_field}`;
          const aiResult = aiRan ? MOCK_AI_RESULTS[key] : undefined;
          const srcField = ALL_SELECTABLE_FIELDS.find(f => f.api_name === m.source_field);
          const tgtField = ALL_SELECTABLE_FIELDS.find(f => f.api_name === m.target_field);
          return (
            <>
              <div key={`src-${i}`} className="relative">
                <select
                  value={m.source_field}
                  onChange={(e) => onUpdate(i, "source_field", e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ALL_SELECTABLE_FIELDS.map(f => (
                    <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              <ArrowRight key={`arrow-${i}`} className="h-4 w-4 text-muted-foreground shrink-0" />

              <div key={`tgt-${i}`} className="relative">
                <select
                  value={m.target_field}
                  onChange={(e) => onUpdate(i, "target_field", e.target.value)}
                  className={cn(
                    "w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                    aiResult?.status === "error"   && "border-red-400",
                    aiResult?.status === "warning" && "border-yellow-400",
                  )}
                >
                  {ALL_SELECTABLE_FIELDS.map(f => (
                    <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              <div key={`ai-${i}`} className="flex items-center justify-center w-5">
                {aiResult?.status === "error"   && <XCircle className="h-4 w-4 text-red-500" />}
                {aiResult?.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {aiResult?.status === "ok"      && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>

              <Button key={`del-${i}`} variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                onClick={() => onRemove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          );
        })}
      </div>

      {/* Per-row AI messages */}
      {aiRan && (
        <div className="space-y-1.5">
          {mappings.map((m, i) => {
            const key = `${m.source_field}→${m.target_field}`;
            const r = MOCK_AI_RESULTS[key];
            if (!r || r.status === "ok") return null;
            return (
              <div key={i} className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                r.status === "error"   && "bg-red-50 text-red-700",
                r.status === "warning" && "bg-yellow-50 text-yellow-700",
              )}>
                {r.status === "error"
                  ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                <span><strong>{m.source_field} → {m.target_field}:</strong> {r.message}</span>
              </div>
            );
          })}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />Add Mapping
      </Button>
    </div>
  );
}

// ─── Step 6: Review + Pre-flight (copied from case 8 in new/page.tsx) ──────────

const MOCK_CHECKS: Array<{ status: "pass" | "warn" | "fail"; category: string; message: string }> = [
  { status: "pass", category: "Connection", message: "Source org connected — Account accessible (47 fields)" },
  { status: "pass", category: "Connection", message: "Target org connected — Account accessible (47 fields)" },
  { status: "pass", category: "Mappings",   message: "Name → Name  (string → string)" },
  { status: "pass", category: "Mappings",   message: "Phone → Phone  (phone → phone)" },
  { status: "pass", category: "Mappings",   message: "Industry → Industry  (picklist → picklist, values match)" },
  { status: "warn", category: "Mappings",   message: "AnnualRevenue → AnnualRevenue  (currency — rounding may differ)" },
  { status: "pass", category: "Sample",     message: "Found 312 Accounts. Simulated payload below. Nothing written." },
];

const MOCK_PAYLOAD = { Name: "Acme Corp", Phone: "+1 555 0100", Industry: "Technology", AnnualRevenue: 4200000 };

function ReviewStep({ name, sourceOrg, targetOrg, sourceObj, targetObj }: {
  name: string; sourceOrg: string; targetOrg: string; sourceObj: string; targetObj: string;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [visible, setVisible] = useState(0);

  function run() {
    setRunning(true); setVisible(0);
    let n = 0;
    const iv = setInterval(() => {
      n++;
      setVisible(n);
      if (n >= MOCK_CHECKS.length) { clearInterval(iv); setTimeout(() => { setRunning(false); setDone(true); }, 250); }
    }, 220);
  }

  return (
    <div className="space-y-6">
      {/* Summary table */}
      <div className="rounded-xl border divide-y">
        {[
          { label: "Sync Name",      value: name || "Account Sync" },
          { label: "Source",         value: `${sourceOrg || "Acme Production"} → ${sourceObj || "Account"}` },
          { label: "Target",         value: `${targetOrg || "Acme Sandbox"} → ${targetObj || "Account"}` },
          { label: "Direction",      value: "One-Way" },
          { label: "Triggers",       value: "Record Created" },
          { label: "Filters",        value: "None (sync all records)" },
          { label: "Field Mappings", value: "4 fields mapped" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Pre-flight panel */}
      <div className="rounded-xl border border-dashed">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Pre-flight Test Run</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Validates connections, schema, permissions, and simulates a real record — nothing is written to your target org.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={running || done}
            className="shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            {running
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running...</>
              : <><FlaskConical className="h-3.5 w-3.5" />Run Test</>}
          </Button>
        </div>

        {!done && !running && (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-muted-foreground">Run a test to validate your configuration before going live.</p>
          </div>
        )}

        {(running || done) && (
          <div className="p-4 space-y-4">
            {done && (
              <div className="flex items-start gap-3 rounded-lg p-3 bg-green-50 border border-green-200">
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Ready to activate</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">All checks passed. 1 advisory note. You&apos;re good to go.</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {MOCK_CHECKS.slice(0, visible).map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2.5 text-xs rounded-lg px-2 py-1.5 -mx-2"
                >
                  {c.status === "pass" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
                  {c.status === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                  {c.status === "fail" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                  <div>
                    <span className={cn("font-medium",
                      c.status === "pass" && "text-green-700",
                      c.status === "warn" && "text-yellow-700",
                      c.status === "fail" && "text-red-700",
                    )}>{c.category}: </span>
                    <span className="text-muted-foreground">{c.message}</span>
                  </div>
                </motion.div>
              ))}
              {running && visible < MOCK_CHECKS.length && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />Checking…
                </div>
              )}
            </div>

            {done && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Simulated Payload (not written)</p>
                <div className="rounded-lg border bg-muted/30 divide-y">
                  {Object.entries(MOCK_PAYLOAD).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
                      <span className="font-mono text-muted-foreground shrink-0">{k}</span>
                      <span className="truncate text-right font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        The sync will be saved as <strong>inactive</strong>. Activate it from the Sync Configs list when you&apos;re ready to go live.
      </p>
    </div>
  );
}

// ─── "Done" screen: Sync card (copied from syncs/page.tsx line 435) ───────────

function LiveSyncCard() {
  const runs = [
    { when: "2m ago",  succeeded: 14, failed: 0,  status: "success" as const },
    { when: "4m ago",  succeeded: 8,  failed: 0,  status: "success" as const },
    { when: "6m ago",  succeeded: 21, failed: 2,  status: "partial" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Sync Configurations</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure and manage your data syncs between Salesforce orgs.</p>
      </div>

      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">Account Sync</h3>
                <Badge className="bg-green-100 text-green-700 border-green-200 border">
                  <CheckCircle2 className="mr-1 h-3 w-3" />Active
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-snug flex items-start gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />
                <span>Whenever an Account record is created in &quot;Acme Production&quot;, it is synced to &quot;Acme Sandbox&quot; as an Account record.</span>
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-sm flex-wrap">
                <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                  <span className="font-medium text-xs text-muted-foreground">FROM</span>
                  <span className="font-semibold text-xs">Acme Production</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs">Account</span>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
                <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                  <span className="font-medium text-xs text-muted-foreground">TO</span>
                  <span className="font-semibold text-xs">Acme Sandbox</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs">Account</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">SB</Badge>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-xs gap-1"><Zap className="h-3 w-3" />Create</Badge>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">2m ago · <span className="text-green-600 font-medium">43 synced</span></span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                  <PauseCircle className="mr-1 h-3 w-3" />Pause
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">Edit</Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground"><Power className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent runs mini-log */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Recent runs</p>
        <div className="space-y-1.5">
          {runs.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm">
              {r.status === "success"
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="text-muted-foreground text-xs w-14 shrink-0">{r.when}</span>
              <span className="font-medium">{r.succeeded} synced</span>
              {r.failed > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="border-red-200 text-red-700 gap-1 text-[10px] h-5">
                    <XCircle className="h-2.5 w-2.5" />{r.failed} failed
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary gap-1">
                    <RotateCcw className="h-3 w-3" />Retry
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main wrapper ──────────────────────────────────────────────────────────────

export function InteractiveDemo() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const [sourceOrg, setSourceOrg] = useState("");
  const [sourceObj, setSourceObj] = useState("");
  const [targetOrg, setTargetOrg] = useState("");
  const [targetObj, setTargetObj] = useState("");
  const [direction, setDirection] = useState<"one_way" | "bidirectional">("one_way");
  const [triggers, setTriggers] = useState({ create: true, update: false, delete: false });
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { source_field: "Name",          target_field: "Name" },
    { source_field: "Phone",         target_field: "Phone" },
    { source_field: "Industry",      target_field: "Industry" },
    { source_field: "AnnualRevenue", target_field: "AnnualRevenue" },
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiRan, setAiRan] = useState(false);

  const sourceOrgLabel = MOCK_ORGS.find(o => o.id === sourceOrg)?.label ?? "Source";
  const targetOrgLabel = MOCK_ORGS.find(o => o.id === targetOrg)?.label ?? "Target";

  function canProceed() {
    if (step === 1) return !!sourceOrg && !!sourceObj;
    if (step === 2) return !!targetOrg && !!targetObj;
    return true;
  }

  function goNext() {
    if (step < 6) setStep(s => s + 1);
    else setDone(true);
  }

  function addFilter() {
    setFilters(p => [...p, { id: String(Date.now()), field: "", field_label: "", operator: "=", value: "" }]);
  }

  function analyzeAI() {
    setAnalyzing(true); setAiRan(false);
    setTimeout(() => { setAnalyzing(false); setAiRan(true); }, 1500);
  }

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setDone(false); setStep(1); setSourceOrg(""); setSourceObj(""); setTargetOrg(""); setTargetObj("");
        setFilters([]); setAiRan(false);
        setMappings([
          { source_field: "Name",          target_field: "Name" },
          { source_field: "Phone",         target_field: "Phone" },
          { source_field: "Industry",      target_field: "Industry" },
          { source_field: "AnnualRevenue", target_field: "AnnualRevenue" },
        ]);
      }, 14000);
      return () => clearTimeout(t);
    }
  }, [done]);

  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Browser chrome */}
      <div className="rounded-xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5 shrink-0">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground">
              {done ? "app.orgsync.io/syncs" : "app.orgsync.io/syncs/new"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <LiveSyncCard />
              </motion.div>
            ) : (
              <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="sm" disabled className="opacity-40">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />Back to Syncs
                  </Button>
                </div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold tracking-tight">New Sync Configuration</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure which objects and fields to sync between your Salesforce orgs.</p>
                </div>

                <StepBar current={step} />

                <Card>
                  <CardContent className="p-6 min-h-64">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {step === 1 && <OrgObjectSelector label="Source" selectedOrgId={sourceOrg} onOrgSelect={setSourceOrg} selectedObject={sourceObj} onObjectSelect={setSourceObj} />}
                        {step === 2 && <OrgObjectSelector label="Target" selectedOrgId={targetOrg} onOrgSelect={setTargetOrg} selectedObject={targetObj} onObjectSelect={setTargetObj} />}
                        {step === 3 && <DirectionTriggersStep direction={direction} triggers={triggers} sourceLabel={sourceOrgLabel} targetLabel={targetOrgLabel} onDirection={setDirection} onTrigger={(k) => setTriggers(p => ({ ...p, [k]: !p[k] }))} />}
                        {step === 4 && <FiltersStep filters={filters} onAdd={addFilter} onRemove={(id) => setFilters(p => p.filter(f => f.id !== id))} onUpdate={(id, field, val) => setFilters(p => p.map(f => f.id === id ? { ...f, [field]: val } : f))} />}
                        {step === 5 && <FieldsStep
                          mappings={mappings}
                          onRemove={(i) => setMappings(p => p.filter((_, idx) => idx !== i))}
                          onUpdate={(i, side, val) => setMappings(p => p.map((m, idx) => idx === i ? { ...m, [side]: val } : m))}
                          onAdd={() => setMappings(p => [...p, { source_field: "Name", target_field: "Name" }])}
                          onAnalyze={analyzeAI}
                          analyzing={analyzing}
                          aiRan={aiRan}
                        />}
                        {step === 6 && <ReviewStep name="Account Sync" sourceOrg={sourceOrgLabel} targetOrg={targetOrgLabel} sourceObj={sourceObj} targetObj={targetObj} />}
                      </motion.div>
                    </AnimatePresence>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />Back
                  </Button>
                  {step < 6 ? (
                    <Button className="gradient-bg border-0 text-white hover:opacity-90" onClick={goNext} disabled={!canProceed()}>
                      Continue<ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className="gradient-bg border-0 text-white hover:opacity-90" onClick={goNext}>
                      <Check className="mr-1.5 h-4 w-4" />Save Sync Config
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute -bottom-6 left-1/2 h-10 w-2/3 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <p className="mt-5 text-center text-xs text-muted-foreground">
        This is the real interface — click through to build a sync yourself.
      </p>
    </div>
  );
}
