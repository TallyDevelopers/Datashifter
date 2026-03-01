"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, Building2, ArrowLeftRight,
  Settings, Filter, Columns, FileText, Loader2, Plus, Trash2,
  ChevronDown, Zap, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConnectedOrg {
  id: string;
  label: string;
  is_sandbox: boolean;
  status: string;
}

interface OrgObject {
  id: string;
  api_name: string;
  label: string;
  is_custom: boolean;
}

interface OrgField {
  api_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_createable: boolean;
  is_updateable: boolean;
}

interface FieldMapping {
  source_field: string;
  source_label: string;
  target_field: string;
  target_label: string;
}

interface FilterRule {
  id: string;
  field: string;
  field_label: string;
  operator: string;
  value: string;
}

interface BuilderState {
  name: string;
  // Step 1
  source_org_id: string;
  source_object: string;
  // Step 2
  target_org_id: string;
  target_object: string;
  // Step 3
  direction: "one_way" | "bidirectional";
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_delete: boolean;
  // Step 4
  filters: FilterRule[];
  // Step 5
  field_mappings: FieldMapping[];
}

const FILTER_OPERATORS = ["=", "!=", "contains", "starts with", "is empty", "is not empty", ">", "<", ">=", "<="];

const STEPS = [
  { id: 1, label: "Source", icon: Building2 },
  { id: 2, label: "Target", icon: Building2 },
  { id: 3, label: "Triggers", icon: Settings },
  { id: 4, label: "Filters", icon: Filter },
  { id: 5, label: "Fields", icon: Columns },
  { id: 6, label: "Review", icon: FileText },
];

// ─── Step Progress Bar ────────────────────────────────────────────────────────

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

// ─── Org + Object selector ────────────────────────────────────────────────────

function OrgObjectSelector({
  label,
  orgs,
  selectedOrgId,
  onOrgSelect,
  objects,
  loadingObjects,
  selectedObject,
  onObjectSelect,
  objectSearch,
  onObjectSearch,
  onSyncMetadata,
  syncingMetadata,
  disabledOrgId,
}: {
  label: string;
  orgs: ConnectedOrg[];
  selectedOrgId: string;
  onOrgSelect: (id: string) => void;
  objects: OrgObject[];
  loadingObjects: boolean;
  selectedObject: string;
  onObjectSelect: (apiName: string) => void;
  objectSearch: string;
  onObjectSearch: (v: string) => void;
  onSyncMetadata: () => void;
  syncingMetadata: boolean;
  disabledOrgId?: string;
}) {
  const filtered = objects.filter(
    (o) =>
      o.label.toLowerCase().includes(objectSearch.toLowerCase()) ||
      o.api_name.toLowerCase().includes(objectSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">{label} Org</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => onOrgSelect(org.id)}
              disabled={org.id === disabledOrgId || org.status !== "active"}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                selectedOrgId === org.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-primary/40 hover:bg-muted/50",
                (org.id === disabledOrgId || org.status !== "active") && "opacity-40 cursor-not-allowed"
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
            <Button variant="ghost" size="sm" onClick={onSyncMetadata} disabled={syncingMetadata} className="h-7 text-xs gap-1">
              {syncingMetadata ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync Metadata
            </Button>
          </div>
          {loadingObjects ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : objects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No objects found. Click &ldquo;Sync Metadata&rdquo; to load objects from this org.</p>
            </div>
          ) : (
            <>
              <Input
                placeholder="Search objects..."
                value={objectSearch}
                onChange={(e) => onObjectSearch(e.target.value)}
                className="mb-3"
              />
              <div className="max-h-64 overflow-y-auto rounded-xl border divide-y">
                {filtered.map((obj) => (
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
                      {obj.is_custom && <Badge variant="secondary" className="text-xs shrink-0">Custom</Badge>}
                      <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">{obj.api_name}</span>
                    </div>
                    {selectedObject === obj.api_name && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewSyncPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<ConnectedOrg[]>([]);
  const [sourceObjects, setSourceObjects] = useState<OrgObject[]>([]);
  const [targetObjects, setTargetObjects] = useState<OrgObject[]>([]);
  const [sourceFields, setSourceFields] = useState<OrgField[]>([]);
  const [targetFields, setTargetFields] = useState<OrgField[]>([]);
  const [loadingSourceObjects, setLoadingSourceObjects] = useState(false);
  const [loadingTargetObjects, setLoadingTargetObjects] = useState(false);
  const [loadingSourceFields, setLoadingSourceFields] = useState(false);
  const [loadingTargetFields, setLoadingTargetFields] = useState(false);
  const [sourceObjSearch, setSourceObjSearch] = useState("");
  const [targetObjSearch, setTargetObjSearch] = useState("");
  const [syncingSourceMeta, setSyncingSourceMeta] = useState(false);
  const [syncingTargetMeta, setSyncingTargetMeta] = useState(false);

  const [state, setState] = useState<BuilderState>({
    name: "",
    source_org_id: "", source_object: "",
    target_org_id: "", target_object: "",
    direction: "one_way",
    trigger_on_create: true, trigger_on_update: false, trigger_on_delete: false,
    filters: [], field_mappings: [],
  });

  // Load orgs on mount
  useEffect(() => {
    fetch("/api/salesforce/orgs")
      .then((r) => r.json())
      .then((d) => setOrgs(d.orgs ?? []));
  }, []);

  // Load objects when source org changes
  const loadSourceObjects = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingSourceObjects(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${orgId}/objects`);
      const data = await res.json();
      setSourceObjects(data.objects ?? []);
    } finally {
      setLoadingSourceObjects(false);
    }
  }, []);

  const loadTargetObjects = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingTargetObjects(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${orgId}/objects`);
      const data = await res.json();
      setTargetObjects(data.objects ?? []);
    } finally {
      setLoadingTargetObjects(false);
    }
  }, []);

  // Load fields when moving to step 5
  const loadFields = useCallback(async () => {
    if (!state.source_org_id || !state.source_object) return;
    setLoadingSourceFields(true);
    setLoadingTargetFields(true);
    try {
      const [srcRes, tgtRes] = await Promise.all([
        fetch(`/api/salesforce/orgs/${state.source_org_id}/objects/${state.source_object}/fields`),
        fetch(`/api/salesforce/orgs/${state.target_org_id}/objects/${state.target_object}/fields`),
      ]);
      const [srcData, tgtData] = await Promise.all([srcRes.json(), tgtRes.json()]);
      setSourceFields(srcData.fields ?? []);
      setTargetFields(tgtData.fields ?? []);

      // Auto-match fields by api_name
      if (state.field_mappings.length === 0) {
        const tgtFieldMap = new Map((tgtData.fields ?? []).map((f: OrgField) => [f.api_name, f]));
        const autoMapped: FieldMapping[] = [];
        for (const sf of (srcData.fields ?? []) as OrgField[]) {
          const tf = tgtFieldMap.get(sf.api_name) as OrgField | undefined;
          if (tf && tf.is_createable) {
            autoMapped.push({
              source_field: sf.api_name,
              source_label: sf.label,
              target_field: tf.api_name,
              target_label: tf.label,
            });
          }
        }
        if (autoMapped.length > 0) {
          setState((prev) => ({ ...prev, field_mappings: autoMapped }));
          toast.success(`Auto-matched ${autoMapped.length} fields by API name`);
        }
      }
    } finally {
      setLoadingSourceFields(false);
      setLoadingTargetFields(false);
    }
  }, [state.source_org_id, state.source_object, state.target_org_id, state.target_object, state.field_mappings.length]);

  async function syncMetadata(orgId: string, isSource: boolean) {
    isSource ? setSyncingSourceMeta(true) : setSyncingTargetMeta(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${orgId}/sync-metadata`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Synced ${data.objectCount} objects`);
      if (isSource) await loadSourceObjects(orgId);
      else await loadTargetObjects(orgId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Metadata sync failed");
    } finally {
      isSource ? setSyncingSourceMeta(false) : setSyncingTargetMeta(false);
    }
  }

  function addFilter() {
    if (sourceFields.length === 0) return;
    const first = sourceFields[0];
    setState((prev) => ({
      ...prev,
      filters: [...prev.filters, {
        id: crypto.randomUUID(),
        field: first.api_name,
        field_label: first.label,
        operator: "=",
        value: "",
      }],
    }));
  }

  function removeFilter(id: string) {
    setState((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.id !== id) }));
  }

  function updateFilter(id: string, key: keyof FilterRule, value: string) {
    setState((prev) => ({
      ...prev,
      filters: prev.filters.map((f) => {
        if (f.id !== id) return f;
        if (key === "field") {
          const field = sourceFields.find((sf) => sf.api_name === value);
          return { ...f, field: value, field_label: field?.label ?? value };
        }
        return { ...f, [key]: value };
      }),
    }));
  }

  function addMapping() {
    const unmapped = sourceFields.find(
      (sf) => !state.field_mappings.some((m) => m.source_field === sf.api_name)
    );
    if (!unmapped) return;
    const match = targetFields.find((tf) => tf.is_createable);
    if (!match) return;
    setState((prev) => ({
      ...prev,
      field_mappings: [...prev.field_mappings, {
        source_field: unmapped.api_name,
        source_label: unmapped.label,
        target_field: match.api_name,
        target_label: match.label,
      }],
    }));
  }

  function removeMapping(idx: number) {
    setState((prev) => ({
      ...prev,
      field_mappings: prev.field_mappings.filter((_, i) => i !== idx),
    }));
  }

  function updateMapping(idx: number, key: "source_field" | "target_field", value: string) {
    setState((prev) => ({
      ...prev,
      field_mappings: prev.field_mappings.map((m, i) => {
        if (i !== idx) return m;
        if (key === "source_field") {
          const f = sourceFields.find((sf) => sf.api_name === value);
          return { ...m, source_field: value, source_label: f?.label ?? value };
        }
        const f = targetFields.find((tf) => tf.api_name === value);
        return { ...m, target_field: value, target_label: f?.label ?? value };
      }),
    }));
  }

  async function handleSave() {
    if (!state.name.trim()) { toast.error("Please enter a name for this sync"); return; }
    if (state.field_mappings.length === 0) { toast.error("Add at least one field mapping"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/syncs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          source_org_id: state.source_org_id,
          source_object: state.source_object,
          target_org_id: state.target_org_id,
          target_object: state.target_object,
          direction: state.direction,
          trigger_on_create: state.trigger_on_create,
          trigger_on_update: state.trigger_on_update,
          trigger_on_delete: state.trigger_on_delete,
          filters: state.filters.map(({ field, operator, value }) => ({ field, operator, value })),
          field_mappings: state.field_mappings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Sync configuration created!");
      router.push("/syncs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sync");
    } finally {
      setSaving(false);
    }
  }

  function canProceed(): boolean {
    if (step === 1) return !!state.source_org_id && !!state.source_object;
    if (step === 2) return !!state.target_org_id && !!state.target_object;
    if (step === 3) return state.trigger_on_create || state.trigger_on_update || state.trigger_on_delete;
    if (step === 6) return !!state.name.trim() && state.field_mappings.length > 0;
    return true;
  }

  function goNext() {
    if (step === 2 && state.field_mappings.length === 0) loadFields();
    if (step === 4) loadFields();
    setStep((s) => s + 1);
  }

  // ─── Step renders ──────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <OrgObjectSelector
            label="Source"
            orgs={orgs}
            selectedOrgId={state.source_org_id}
            onOrgSelect={(id) => {
              setState((p) => ({ ...p, source_org_id: id, source_object: "" }));
              loadSourceObjects(id);
            }}
            objects={sourceObjects}
            loadingObjects={loadingSourceObjects}
            selectedObject={state.source_object}
            onObjectSelect={(v) => setState((p) => ({ ...p, source_object: v }))}
            objectSearch={sourceObjSearch}
            onObjectSearch={setSourceObjSearch}
            onSyncMetadata={() => syncMetadata(state.source_org_id, true)}
            syncingMetadata={syncingSourceMeta}
          />
        );

      case 2:
        return (
          <OrgObjectSelector
            label="Target"
            orgs={orgs}
            selectedOrgId={state.target_org_id}
            onOrgSelect={(id) => {
              setState((p) => ({ ...p, target_org_id: id, target_object: "" }));
              loadTargetObjects(id);
            }}
            objects={targetObjects}
            loadingObjects={loadingTargetObjects}
            selectedObject={state.target_object}
            onObjectSelect={(v) => setState((p) => ({ ...p, target_object: v }))}
            objectSearch={targetObjSearch}
            onObjectSearch={setTargetObjSearch}
            onSyncMetadata={() => syncMetadata(state.target_org_id, false)}
            syncingMetadata={syncingTargetMeta}
            disabledOrgId={state.source_org_id === state.target_org_id ? undefined : undefined}
          />
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Sync Direction</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  { value: "one_way", label: "One-Way", desc: `${orgs.find(o => o.id === state.source_org_id)?.label ?? "Source"} → ${orgs.find(o => o.id === state.target_org_id)?.label ?? "Target"}` },
                  { value: "bidirectional", label: "Bidirectional", desc: "Changes in either org sync to the other" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setState((p) => ({ ...p, direction: opt.value }))}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      state.direction === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <ArrowLeftRight className={cn("mt-0.5 h-4 w-4 shrink-0", state.direction === opt.value ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {state.direction === opt.value && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Trigger On</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Which record events should trigger a sync</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { key: "trigger_on_create" as const, label: "Record Created", desc: "New record in source org" },
                  { key: "trigger_on_update" as const, label: "Record Updated", desc: "Field changes in source org" },
                  { key: "trigger_on_delete" as const, label: "Record Deleted", desc: "Record removed from source org" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setState((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                      state[opt.key] ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Zap className={cn("h-4 w-4", state[opt.key] ? "text-primary" : "text-muted-foreground")} />
                      {state[opt.key] && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="font-medium text-sm mt-2">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Only sync records that match ALL of these conditions. Leave empty to sync all records.
              </p>
            </div>
            {state.filters.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium">No filters — all records will sync</p>
                <p className="mt-1 text-xs text-muted-foreground">Add a filter to restrict which records get synced</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={addFilter}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {state.filters.map((filter, i) => (
                  <div key={filter.id} className="flex items-center gap-2 flex-wrap">
                    {i > 0 && <span className="text-xs font-medium text-muted-foreground w-8">AND</span>}
                    {i === 0 && <span className="text-xs font-medium text-muted-foreground w-8">IF</span>}
                    <div className="relative">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, "field", e.target.value)}
                        className="h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {sourceFields.map((f) => (
                          <option key={f.api_name} value={f.api_name}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, "operator", e.target.value)}
                        className="h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {FILTER_OPERATORS.map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                    {!["is empty", "is not empty"].includes(filter.operator) && (
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                        placeholder="Value"
                        className="h-9 w-40"
                      />
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeFilter(filter.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Condition
                </Button>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map source fields to target fields. Fields with matching API names were auto-matched.
            </p>
            {(loadingSourceFields || loadingTargetFields) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-3 gap-y-3 items-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source Field</div>
                  <div />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Field</div>
                  <div />
                  {state.field_mappings.map((mapping, i) => (
                    <>
                      <div key={`src-${i}`} className="relative">
                        <select
                          value={mapping.source_field}
                          onChange={(e) => updateMapping(i, "source_field", e.target.value)}
                          className="w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {sourceFields.map((f) => (
                            <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                      <ArrowRight key={`arrow-${i}`} className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div key={`tgt-${i}`} className="relative">
                        <select
                          value={mapping.target_field}
                          onChange={(e) => updateMapping(i, "target_field", e.target.value)}
                          className="w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {targetFields.filter((f) => f.is_createable || f.is_updateable).map((f) => (
                            <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                      <Button key={`del-${i}`} variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeMapping(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addMapping}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Mapping
                </Button>
              </>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sync-name">Sync Config Name</Label>
              <Input
                id="sync-name"
                value={state.name}
                onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Account Sync — Prod to Sandbox"
                autoFocus
              />
            </div>
            <div className="rounded-xl border divide-y">
              {[
                { label: "Source", value: `${orgs.find(o => o.id === state.source_org_id)?.label} → ${state.source_object}` },
                { label: "Target", value: `${orgs.find(o => o.id === state.target_org_id)?.label} → ${state.target_object}` },
                { label: "Direction", value: state.direction === "bidirectional" ? "Bidirectional" : "One-Way" },
                { label: "Triggers", value: [state.trigger_on_create && "Create", state.trigger_on_update && "Update", state.trigger_on_delete && "Delete"].filter(Boolean).join(", ") },
                { label: "Filters", value: state.filters.length > 0 ? `${state.filters.length} condition${state.filters.length > 1 ? "s" : ""}` : "None (sync all records)" },
                { label: "Field Mappings", value: `${state.field_mappings.length} field${state.field_mappings.length !== 1 ? "s" : ""} mapped` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              The sync will be saved as <strong>inactive</strong>. Activate it from the Sync Configs list when you&apos;re ready to go live.
            </p>
          </div>
        );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/syncs">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Syncs
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight">New Sync Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which objects and fields to sync between your Salesforce orgs.
        </p>
      </div>

      <StepBar current={step} />

      <Card>
        <CardContent className="p-6 min-h-64">
          {renderStep()}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        {step < 6 ? (
          <Button
            className="gradient-bg border-0 text-white hover:opacity-90"
            onClick={goNext}
            disabled={!canProceed()}
          >
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="gradient-bg border-0 text-white hover:opacity-90"
            onClick={handleSave}
            disabled={saving || !canProceed()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Save Sync Config
          </Button>
        )}
      </div>
    </div>
  );
}
