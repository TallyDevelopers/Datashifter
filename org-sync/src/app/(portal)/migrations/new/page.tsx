"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ArrowLeft, Building2, List, GitBranch, Columns, Filter,
  Clock, Sparkles, FileText, Plus, Trash2, GripVertical,
  ArrowRight, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Info, Loader2, ArrowUpDown, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CpqReviewWarning } from "@/app/api/ai/cpq-review/route";

// ─── Templates ────────────────────────────────────────────────────────────────

interface MigrationTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  steps: Array<{
    label: string;
    source_object: string;
    target_object: string;
  }>;
  defaultName: string;
}

const TEMPLATES: MigrationTemplate[] = [
  {
    id: "scratch",
    name: "Start from scratch",
    description: "Define your own objects, order, and field mappings. For any migration — simple or complex.",
    badge: "Custom",
    badgeColor: "bg-muted text-muted-foreground border-border",
    steps: [],
    defaultName: "",
  },
  {
    id: "cpq-full",
    name: "Salesforce CPQ — Full Product & Pricing",
    description: "Syncs the full CPQ product catalog in dependency order: Products → Pricebooks → Pricebook Entries → Options.",
    badge: "CPQ",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    steps: [
      { label: "Products", source_object: "Product2", target_object: "Product2" },
      { label: "Pricebooks", source_object: "Pricebook2", target_object: "Pricebook2" },
      { label: "Pricebook Entries", source_object: "PricebookEntry", target_object: "PricebookEntry" },
      { label: "Product Options", source_object: "SBQQ__ProductOption__c", target_object: "SBQQ__ProductOption__c" },
      { label: "Product Features", source_object: "SBQQ__ProductFeature__c", target_object: "SBQQ__ProductFeature__c" },
    ],
    defaultName: "CPQ Product & Pricing Migration",
  },
  {
    id: "cpq-quotes",
    name: "Salesforce CPQ — Quotes & Quote Lines",
    description: "Migrates CPQ Quotes and their line items in the correct order. Requires Products & Pricebooks to already exist in the target org.",
    badge: "CPQ",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    steps: [
      { label: "Quotes", source_object: "SBQQ__Quote__c", target_object: "SBQQ__Quote__c" },
      { label: "Quote Lines", source_object: "SBQQ__QuoteLine__c", target_object: "SBQQ__QuoteLine__c" },
      { label: "Quote Line Groups", source_object: "SBQQ__QuoteLineGroup__c", target_object: "SBQQ__QuoteLineGroup__c" },
    ],
    defaultName: "CPQ Quotes Migration",
  },
  {
    id: "rca-catalog",
    name: "Revenue Cloud Advanced — Product Catalog",
    description: "Migrates RCA product catalog objects in dependency order for Revenue Cloud Advanced orgs.",
    badge: "RCA",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    steps: [
      { label: "Product Catalog", source_object: "ProductCatalog", target_object: "ProductCatalog" },
      { label: "Product Categories", source_object: "ProductCategory", target_object: "ProductCategory" },
      { label: "Products", source_object: "Product2", target_object: "Product2" },
      { label: "Price Books", source_object: "Pricebook2", target_object: "Pricebook2" },
      { label: "Price Book Entries", source_object: "PricebookEntry", target_object: "PricebookEntry" },
    ],
    defaultName: "RCA Product Catalog Migration",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectedOrg {
  id: string;
  label: string;
  is_sandbox: boolean;
}

interface OrgObject {
  api_name: string;
  label: string;
}

interface OrgField {
  api_name: string;
  label: string;
  field_type: string;
  picklist_values?: string[];
}

interface FieldMapping {
  source_field: string;
  source_label: string;
  target_field: string;
  target_label: string;
}

interface FilterRule {
  field: string;
  operator: string;
  value: string;
  picklist_values?: string[];
}

interface JobStep {
  id: string; // local only, for keying
  step_order: number;
  label: string;
  source_object: string;
  source_object_label: string;
  target_object: string;
  target_object_label: string;
  field_mappings: FieldMapping[];
  filters: FilterRule[];
  expanded: boolean;
  // loaded fields
  sourceFields: OrgField[];
  targetFields: OrgField[];
  fieldsLoaded: boolean;
}

interface BuilderState {
  name: string;
  description: string;
  source_org_id: string;
  target_org_id: string;
  interval_minutes: number;
  is_active: boolean;
  steps: JobStep[];
}

// ─── Steps definition ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Orgs", icon: Building2 },
  { id: 2, label: "Objects", icon: List },
  { id: 3, label: "Order", icon: GitBranch },
  { id: 4, label: "Mappings", icon: Columns },
  { id: 5, label: "Filters", icon: Filter },
  { id: 6, label: "Schedule", icon: Clock },
  { id: 7, label: "AI Review", icon: Sparkles },
  { id: 8, label: "Confirm", icon: FileText },
];

const OPERATORS = ["=", "!=", "contains", "starts with", "is empty", "is not empty", ">", "<", ">=", "<="];
const INTERVALS = [
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every hour", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every 24 hours", value: 1440 },
  { label: "Manual only", value: 0 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewCpqJobPage() {
  const router = useRouter();
  const [templateChosen, setTemplateChosen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<ConnectedOrg[]>([]);
  const [sourceObjects, setSourceObjects] = useState<OrgObject[]>([]);
  const [aiWarnings, setAiWarnings] = useState<CpqReviewWarning[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);

  const [state, setState] = useState<BuilderState>({
    name: "",
    description: "",
    source_org_id: "",
    target_org_id: "",
    interval_minutes: 60,
    is_active: false,
    steps: [],
  });

  // Load orgs on mount
  useEffect(() => {
    fetch("/api/salesforce/orgs")
      .then((r) => r.json())
      .then((d) => setOrgs(d.orgs ?? []));
  }, []);

  // Load source objects when source org is selected
  const loadObjects = useCallback(async (orgId: string) => {
    if (!orgId) return;
    const res = await fetch(`/api/salesforce/orgs/${orgId}/objects`);
    const data = await res.json();
    setSourceObjects(data.objects ?? []);
  }, []);

  useEffect(() => {
    if (state.source_org_id) loadObjects(state.source_org_id);
  }, [state.source_org_id, loadObjects]);

  // Load fields for a step
  const loadStepFields = useCallback(async (stepIdx: number) => {
    const s = state.steps[stepIdx];
    if (!s || s.fieldsLoaded) return;

    const [srcRes, tgtRes] = await Promise.all([
      fetch(`/api/salesforce/orgs/${state.source_org_id}/objects/${s.source_object}/fields`),
      fetch(`/api/salesforce/orgs/${state.target_org_id}/objects/${s.target_object}/fields`),
    ]);
    const [srcData, tgtData] = await Promise.all([srcRes.json(), tgtRes.json()]);

    setState((prev) => {
      const steps = [...prev.steps];
      steps[stepIdx] = {
        ...steps[stepIdx],
        sourceFields: srcData.fields ?? [],
        targetFields: tgtData.fields ?? [],
        fieldsLoaded: true,
      };
      return { ...prev, steps };
    });
  }, [state.steps, state.source_org_id, state.target_org_id]);

  // Auto-map matching fields
  const autoMap = useCallback((stepIdx: number) => {
    setState((prev) => {
      const steps = [...prev.steps];
      const s = steps[stepIdx];
      const srcNames = new Set(s.sourceFields.map((f) => f.api_name));
      const tgtNames = new Set(s.targetFields.map((f) => f.api_name));
      const matched: FieldMapping[] = [];
      for (const name of srcNames) {
        if (tgtNames.has(name) && name.toLowerCase() !== "ownerid") {
          const srcField = s.sourceFields.find((f) => f.api_name === name)!;
          const tgtField = s.targetFields.find((f) => f.api_name === name)!;
          matched.push({
            source_field: name,
            source_label: srcField.label,
            target_field: name,
            target_label: tgtField.label,
          });
        }
      }
      steps[stepIdx] = { ...s, field_mappings: matched };
      return { ...prev, steps };
    });
  }, []);

  // Run AI review
  const runAiReview = useCallback(async () => {
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const res = await fetch("/api/ai/cpq-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_org_id: state.source_org_id,
          target_org_id: state.target_org_id,
          steps: state.steps.map((s) => ({
            step_order: s.step_order,
            label: s.label,
            source_object: s.source_object,
            target_object: s.target_object,
            field_mappings: s.field_mappings,
            filters: s.filters,
          })),
        }),
      });
      const data = await res.json();
      setAiWarnings(data.warnings ?? []);
    } catch {
      setAiWarnings([]);
    } finally {
      setAiLoading(false);
    }
  }, [state]);

  // Save
  const applyTemplate = useCallback((template: MigrationTemplate) => {
    const templateSteps: JobStep[] = template.steps.map((s, i) => ({
      id: crypto.randomUUID(),
      step_order: i + 1,
      label: s.label,
      source_object: s.source_object,
      source_object_label: s.source_object,
      target_object: s.target_object,
      target_object_label: s.target_object,
      field_mappings: [],
      filters: [],
      expanded: false,
      sourceFields: [],
      targetFields: [],
      fieldsLoaded: false,
    }));

    setState((prev) => ({
      ...prev,
      name: template.defaultName || prev.name,
      steps: templateSteps,
    }));
    setTemplateChosen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/migrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          source_org_id: state.source_org_id,
          target_org_id: state.target_org_id,
          interval_minutes: state.interval_minutes,
          is_active: state.is_active,
          steps: state.steps.map((s) => ({
            step_order: s.step_order,
            label: s.label,
            source_object: s.source_object,
            target_object: s.target_object,
            field_mappings: s.field_mappings,
            filters: s.filters,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Failed to save"]);
        return;
      }
      router.push("/migrations");
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setSaving(false);
    }
  }, [state, router]);

  const canProceed = () => {
    switch (step) {
      case 1: return !!state.source_org_id && !!state.target_org_id && !!state.name;
      case 2: return state.steps.length > 0;
      case 3: return state.steps.length > 0;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return true;
      case 8: return true;
      default: return false;
    }
  };

  const goNext = async () => {
    if (step === 3) {
      // Load fields for all steps before moving to mappings
      for (let i = 0; i < state.steps.length; i++) {
        await loadStepFields(i);
        autoMap(i);
      }
    }
    if (step === 6) {
      await runAiReview();
    }
    setStep((s) => s + 1);
  };

  // ─── Step renderers ─────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 1: return <StepOrgs state={state} setState={setState} orgs={orgs} />;
      case 2: return <StepObjects state={state} setState={setState} sourceObjects={sourceObjects} targetOrg={orgs.find((o) => o.id === state.target_org_id)} />;
      case 3: return <StepOrder state={state} setState={setState} />;
      case 4: return <StepMappings state={state} setState={setState} loadStepFields={loadStepFields} autoMap={autoMap} />;
      case 5: return <StepFilters state={state} setState={setState} />;
      case 6: return <StepSchedule state={state} setState={setState} />;
      case 7: return <StepAiReview warnings={aiWarnings} loading={aiLoading} acknowledged={acknowledgedWarnings} setAcknowledged={setAcknowledgedWarnings} onRerun={runAiReview} onJumpToStep={setStep} steps={state.steps} />;
      case 8: return <StepConfirm state={state} setState={setState} errors={errors} />;
      default: return null;
    }
  }

  // ── Template picker (shown before builder) ─────────────────────────────────
  if (!templateChosen) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-8">
            <Link href="/migrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Migrations
            </Link>
            <h1 className="text-2xl font-bold">New Migration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start from scratch or use a pre-built template for common Salesforce data models.
            </p>
          </div>

          <div className="space-y-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="w-full text-left rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all p-5 group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:gradient-bg transition-all">
                    <GitBranch className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{template.name}</p>
                      <Badge variant="outline" className={cn("text-[10px]", template.badgeColor)}>
                        {template.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    {template.steps.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {template.steps.map((s, i) => (
                          <span key={s.source_object} className="flex items-center gap-1">
                            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">{s.source_object}</span>
                            {i < template.steps.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/migrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Migrations
          </Link>
          <h1 className="text-2xl font-bold">New Migration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define an ordered chain of objects to migrate with dependency-aware execution.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const isComplete = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <div className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    isComplete ? "gradient-bg text-white" :
                    isCurrent ? "bg-primary/10 border border-primary/30 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <s.icon className="h-3.5 w-3.5" />
                    )}
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("h-px w-4", step > s.id ? "bg-primary" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">{renderStep()}</div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {step < 8 ? (
            <div className="relative group">
              <Button onClick={goNext} disabled={!canProceed()} className="gradient-bg border-0 text-white hover:opacity-90">
              {step === 6 ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run AI Review
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
              {step === 2 && !canProceed() && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
                  Click &ldquo;+ Add Step&rdquo; to add your object to the chain first
                </div>
              )}
            </div>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gradient-bg border-0 text-white hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {state.is_active ? "Save & Activate" : "Save Job"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Orgs ─────────────────────────────────────────────────────────────

function StepOrgs({ state, setState, orgs }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  orgs: ConnectedOrg[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Job Details & Orgs</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Job Name</label>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. CPQ Products & Pricing Sync"
            value={state.name}
            onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={2}
            placeholder="What does this job sync and why?"
            value={state.description}
            onChange={(e) => setState((p) => ({ ...p, description: e.target.value }))}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <OrgSelector
            label="Source Org"
            subtitle="Where records are read from"
            value={state.source_org_id}
            orgs={orgs}
            exclude={state.target_org_id}
            onChange={(id) => setState((p) => ({ ...p, source_org_id: id }))}
          />
          <OrgSelector
            label="Target Org"
            subtitle="Where records are written to"
            value={state.target_org_id}
            orgs={orgs}
            exclude={state.source_org_id}
            onChange={(id) => setState((p) => ({ ...p, target_org_id: id }))}
          />
        </div>
        {state.source_org_id && state.target_org_id && state.source_org_id === state.target_org_id && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Same org selected for source and target. Records will be read and written to the same org — useful for testing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrgSelector({ label, subtitle, value, orgs, exclude, onChange }: {
  label: string; subtitle: string; value: string;
  orgs: ConnectedOrg[]; exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {orgs.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-muted p-5 flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No orgs connected yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect a Salesforce org first.</p>
            </div>
            <Link
              href="/orgs"
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
              Go to Connected Orgs
            </Link>
          </div>
        )}
        {orgs.map((org) => {
          const isSelected = value === org.id;
          return (
            <button
              key={org.id}
              onClick={() => onChange(isSelected ? "" : org.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-bg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{org.label}</p>
                <p className="text-xs text-muted-foreground">{org.is_sandbox ? "Sandbox" : "Production"}</p>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Objects ──────────────────────────────────────────────────────────

function StepObjects({ state, setState, sourceObjects, targetOrg }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  sourceObjects: OrgObject[];
  targetOrg?: ConnectedOrg;
}) {
  const [newSourceObj, setNewSourceObj] = useState("");
  const [newTargetObj, setNewTargetObj] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [targetObjects, setTargetObjects] = useState<OrgObject[]>([]);
  const [loadingTargetObjects, setLoadingTargetObjects] = useState(false);

  useEffect(() => {
    if (!targetOrg?.id) return;
    setLoadingTargetObjects(true);
    fetch(`/api/salesforce/orgs/${targetOrg.id}/objects`)
      .then((r) => r.json())
      .then((d) => setTargetObjects(d.objects ?? []))
      .catch(() => setTargetObjects([]))
      .finally(() => setLoadingTargetObjects(false));
  }, [targetOrg?.id]);

  const addStep = () => {
    if (!newSourceObj || !newTargetObj) return;
    const srcObj = sourceObjects.find((o) => o.api_name === newSourceObj);
    const nextOrder = state.steps.length + 1;
    setState((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: crypto.randomUUID(),
          step_order: nextOrder,
          label: newLabel || srcObj?.label || newSourceObj,
          source_object: newSourceObj,
          source_object_label: srcObj?.label ?? newSourceObj,
          target_object: newTargetObj,
          target_object_label: newTargetObj,
          field_mappings: [],
          filters: [],
          expanded: false,
          sourceFields: [],
          targetFields: [],
          fieldsLoaded: false,
        },
      ],
    }));
    setNewSourceObj("");
    setNewTargetObj("");
    setNewLabel("");
  };

  const removeStep = (id: string) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, step_order: i + 1 })),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Object Chain</CardTitle>
        <p className="text-sm text-muted-foreground">Add each Salesforce object you want to sync. You&apos;ll set the execution order in the next step.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing steps */}
        {state.steps.length > 0 && (
          <div className="space-y-2">
            {state.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {s.step_order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.source_object} → {s.target_object}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeStep(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new step */}
        <div className="rounded-xl border-2 border-dashed border-primary/20 p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Add an object step</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Source Object</label>
              <SearchableSelect
                options={sourceObjects.map((o) => ({ value: o.api_name, label: o.label, sublabel: o.api_name }))}
                value={newSourceObj}
                onChange={(v) => { setNewSourceObj(v); if (!newTargetObj) setNewTargetObj(v); }}
                placeholder="Select object…"
                searchPlaceholder="Search objects..."
                emptyMessage="No objects found. Sync metadata first."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Target Object</label>
              {loadingTargetObjects ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                </div>
              ) : targetObjects.length > 0 ? (
                <SearchableSelect
                  options={targetObjects.map((o) => ({ value: o.api_name, label: o.label, sublabel: o.api_name }))}
                  value={newTargetObj}
                  onChange={setNewTargetObj}
                  placeholder="Select object…"
                  searchPlaceholder="Search objects..."
                  emptyMessage="No objects found."
                />
              ) : (
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={newSourceObj || "e.g. SBQQ__Quote__c"}
                  value={newTargetObj}
                  onChange={(e) => setNewTargetObj(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Step Label (optional)</label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Products"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addStep}
            disabled={!newSourceObj || !newTargetObj}
            className={cn(
              "border-primary/30 text-primary hover:bg-primary/5 transition-all",
              newSourceObj && newTargetObj && "animate-pulse border-primary text-primary bg-primary/5"
            )}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Step
          </Button>
        </div>

        {targetOrg && (
          <p className="text-xs text-muted-foreground">
            Target org: <span className="font-medium">{targetOrg.label}</span>. Enter the API name of the target object exactly as it appears in that org.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Order ────────────────────────────────────────────────────────────

function StepOrder({ state, setState }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
}) {
  const moveStep = (idx: number, direction: "up" | "down") => {
    setState((prev) => {
      const steps = [...prev.steps];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= steps.length) return prev;
      [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, step_order: i + 1 })),
      };
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dependency Order</CardTitle>
        <p className="text-sm text-muted-foreground">
          Arrange objects so parents come before children. If a step fails, all subsequent steps are skipped to prevent broken foreign keys.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="rounded-xl border bg-muted/40 border-muted px-4 py-3 mb-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Drag steps to reorder. Parent objects must come before child objects — if a step fails, all subsequent steps are skipped to prevent broken foreign keys.
          </p>
        </div>
        {state.steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
              {s.step_order}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.source_object} → {s.target_object}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(i, "up")} disabled={i === 0}>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(i, "down")} disabled={i === state.steps.length - 1}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Mappings ─────────────────────────────────────────────────────────

function StepMappings({ state, setState, loadStepFields, autoMap }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  loadStepFields: (idx: number) => Promise<void>;
  autoMap: (idx: number) => void;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  const toggleExpand = async (idx: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
    await loadStepFields(idx);
  };

  const addMapping = (stepIdx: number) => {
    setState((prev) => {
      const steps = [...prev.steps];
      steps[stepIdx] = {
        ...steps[stepIdx],
        field_mappings: [
          ...steps[stepIdx].field_mappings,
          { source_field: "", source_label: "", target_field: "", target_label: "" },
        ],
      };
      return { ...prev, steps };
    });
  };

  const updateMapping = (stepIdx: number, mapIdx: number, key: keyof FieldMapping, value: string) => {
    setState((prev) => {
      const steps = [...prev.steps];
      const mappings = [...steps[stepIdx].field_mappings];
      mappings[mapIdx] = { ...mappings[mapIdx], [key]: value };
      // Auto-fill labels
      if (key === "source_field") {
        const f = steps[stepIdx].sourceFields.find((f) => f.api_name === value);
        if (f) mappings[mapIdx].source_label = f.label;
      }
      if (key === "target_field") {
        const f = steps[stepIdx].targetFields.find((f) => f.api_name === value);
        if (f) mappings[mapIdx].target_label = f.label;
      }
      steps[stepIdx] = { ...steps[stepIdx], field_mappings: mappings };
      return { ...prev, steps };
    });
  };

  const removeMapping = (stepIdx: number, mapIdx: number) => {
    setState((prev) => {
      const steps = [...prev.steps];
      const mappings = steps[stepIdx].field_mappings.filter((_, i) => i !== mapIdx);
      steps[stepIdx] = { ...steps[stepIdx], field_mappings: mappings };
      return { ...prev, steps };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Field Mappings</h2>
          <p className="text-sm text-muted-foreground">Map source fields to target fields for each object step. Fields were auto-matched by exact API name.</p>
        </div>
      </div>
      {state.steps.map((s, stepIdx) => (
        <Card key={s.id}>
          <button
            onClick={() => toggleExpand(stepIdx)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
              {s.step_order}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.source_object} → {s.target_object} · {s.field_mappings.length} field{s.field_mappings.length !== 1 ? "s" : ""} mapped</p>
            </div>
            {expandedSteps.has(stepIdx) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedSteps.has(stepIdx) && (
            <CardContent className="pt-0 space-y-3">
              {!s.fieldsLoaded ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading fields…
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{s.field_mappings.length} mapping{s.field_mappings.length !== 1 ? "s" : ""}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => autoMap(stepIdx)}>
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        Re-auto-map
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addMapping(stepIdx)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add row
                      </Button>
                    </div>
                  </div>

                  {s.field_mappings.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No mappings yet. Click &quot;Re-auto-map&quot; or add rows manually.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <span>Source Field</span>
                        <span />
                        <span>Target Field</span>
                        <span />
                      </div>
                      {s.field_mappings.map((m, mapIdx) => (
                        <div key={mapIdx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                          <select
                            className="w-full rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={m.source_field}
                            onChange={(e) => updateMapping(stepIdx, mapIdx, "source_field", e.target.value)}
                          >
                            <option value="">Source…</option>
                            {s.sourceFields.map((f) => (
                              <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                            ))}
                          </select>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <select
                            className="w-full rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={m.target_field}
                            onChange={(e) => updateMapping(stepIdx, mapIdx, "target_field", e.target.value)}
                          >
                            <option value="">Target…</option>
                            {s.targetFields.map((f) => (
                              <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeMapping(stepIdx, mapIdx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Step 5: Filters ──────────────────────────────────────────────────────────

function StepFilters({ state, setState }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const addFilter = (stepIdx: number) => {
    setState((prev) => {
      const steps = [...prev.steps];
      steps[stepIdx] = {
        ...steps[stepIdx],
        filters: [...steps[stepIdx].filters, { field: "", operator: "=", value: "" }],
      };
      return { ...prev, steps };
    });
  };

  const updateFilter = (stepIdx: number, filterIdx: number, key: keyof FilterRule, value: string) => {
    setState((prev) => {
      const steps = [...prev.steps];
      const filters = [...steps[stepIdx].filters];
      filters[filterIdx] = { ...filters[filterIdx], [key]: value };
      steps[stepIdx] = { ...steps[stepIdx], filters };
      return { ...prev, steps };
    });
  };

  const removeFilter = (stepIdx: number, filterIdx: number) => {
    setState((prev) => {
      const steps = [...prev.steps];
      steps[stepIdx] = {
        ...steps[stepIdx],
        filters: steps[stepIdx].filters.filter((_, i) => i !== filterIdx),
      };
      return { ...prev, steps };
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Filters</h2>
        <p className="text-sm text-muted-foreground">Optionally filter which records are synced for each step. Leave empty to sync all records.</p>
      </div>
      {state.steps.map((s, stepIdx) => (
        <Card key={s.id}>
          <button
            onClick={() => setExpandedSteps((prev) => {
              const next = new Set(prev);
              next.has(stepIdx) ? next.delete(stepIdx) : next.add(stepIdx);
              return next;
            })}
            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
              {s.step_order}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">
                {s.filters.length > 0 ? `${s.filters.length} filter condition${s.filters.length !== 1 ? "s" : ""}` : "No filters — all records"}
              </p>
            </div>
            {expandedSteps.has(stepIdx) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedSteps.has(stepIdx) && (
            <CardContent className="pt-0 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Only sync records that match ALL of these conditions.</p>
              {s.filters.map((f, filterIdx) => {
                const srcField = s.sourceFields.find((sf) => sf.api_name === f.field);
                const isPicklist = srcField?.field_type === "picklist";
                const needsValue = !["is empty", "is not empty"].includes(f.operator);
                return (
                  <div key={filterIdx} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground w-4">{filterIdx === 0 ? "IF" : "AND"}</span>
                    <select
                      className="rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={f.field}
                      onChange={(e) => updateFilter(stepIdx, filterIdx, "field", e.target.value)}
                    >
                      <option value="">Field…</option>
                      {s.sourceFields.map((sf) => (
                        <option key={sf.api_name} value={sf.api_name}>{sf.label} ({sf.api_name})</option>
                      ))}
                    </select>
                    <select
                      className="rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={f.operator}
                      onChange={(e) => updateFilter(stepIdx, filterIdx, "operator", e.target.value)}
                    >
                      {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                    {needsValue && (
                      isPicklist && srcField?.picklist_values?.length ? (
                        <select
                          className="rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={f.value}
                          onChange={(e) => updateFilter(stepIdx, filterIdx, "value", e.target.value)}
                        >
                          <option value="">Select value…</option>
                          {srcField.picklist_values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <input
                          className="rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => updateFilter(stepIdx, filterIdx, "value", e.target.value)}
                        />
                      )
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFilter(stepIdx, filterIdx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="h-7 text-xs mt-1" onClick={() => addFilter(stepIdx)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </Button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Step 6: Schedule ─────────────────────────────────────────────────────────

function StepSchedule({ state, setState }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
        <p className="text-sm text-muted-foreground">Choose how often this job runs automatically, or run it manually only.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERVALS.map((interval) => (
            <button
              key={interval.value}
              onClick={() => setState((p) => ({ ...p, interval_minutes: interval.value }))}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                state.interval_minutes === interval.value
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/30 hover:bg-accent"
              )}
            >
              <Clock className={cn("h-4 w-4 shrink-0", state.interval_minutes === interval.value ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", state.interval_minutes === interval.value ? "text-primary" : "")}>{interval.label}</span>
              {state.interval_minutes === interval.value && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
            </button>
          ))}
        </div>
        {state.interval_minutes === 0 && (
          <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
            This job will only run when you manually trigger it from the job detail page.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step 7: AI Review ────────────────────────────────────────────────────────

function StepAiReview({ warnings, loading, acknowledged, setAcknowledged, onRerun, onJumpToStep, steps }: {
  warnings: CpqReviewWarning[];
  loading: boolean;
  acknowledged: Set<string>;
  setAcknowledged: React.Dispatch<React.SetStateAction<Set<string>>>;
  onRerun: () => Promise<void>;
  onJumpToStep: (s: number) => void;
  steps: JobStep[];
}) {
  const warnKey = (w: CpqReviewWarning) => `${w.step}-${w.field}-${w.severity}`;
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warn");
  const infos = warnings.filter((w) => w.severity === "info");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">AI is reviewing your dependency chain…</p>
          <p className="text-xs">Checking field references, required fields, and foreign key ordering.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Dependency Review
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">AI reviewed your object chain and field mappings for dependency issues.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRerun} className="shrink-0">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Re-run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">All clear</p>
              <p className="text-xs text-green-600">No dependency issues detected. Your object chain looks good.</p>
            </div>
          </div>
        ) : (
          <>
            {errors.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3">
                <p className="text-xs font-semibold text-destructive mb-1">{errors.length} error{errors.length !== 1 ? "s" : ""} — will likely cause failures</p>
              </div>
            )}
            {[...errors, ...warns, ...infos].map((w) => {
              const key = warnKey(w);
              const isAck = acknowledged.has(key);
              const stepLabel = steps.find((s) => s.step_order === w.step)?.label ?? w.object;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border px-4 py-3 transition-all",
                    isAck ? "opacity-50 bg-muted/30" :
                    w.severity === "error" ? "border-destructive/30 bg-destructive/5" :
                    w.severity === "warn" ? "border-amber-200 bg-amber-50" :
                    "border-border bg-muted/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {w.severity === "error" ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> :
                     w.severity === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> :
                     <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">Step {w.step}: {stepLabel}</Badge>
                        {w.field && <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{w.field}</code>}
                      </div>
                      <p className="text-sm mt-1">{w.message}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const stepNum = w.step <= 2 ? 2 : 3; // Objects or Order step
                          onJumpToStep(stepNum);
                        }}
                      >
                        Fix
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => setAcknowledged((prev) => {
                          const next = new Set(prev);
                          isAck ? next.delete(key) : next.add(key);
                          return next;
                        })}
                      >
                        {isAck ? "Undo" : "Acknowledge"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step 8: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({ state, setState, errors }: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  errors: string[];
}) {
  const intervalLabel = INTERVALS.find((i) => i.value === state.interval_minutes)?.label ?? "Custom";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Review & Confirm</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Job name</span>
              <span className="font-medium">{state.name}</span>
            </div>
            {state.description && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium max-w-xs text-right">{state.description}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Object steps</span>
              <span className="font-medium">{state.steps.length} objects</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Total field mappings</span>
              <span className="font-medium">{state.steps.reduce((a, s) => a + s.field_mappings.length, 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium">{intervalLabel}</span>
            </div>
          </div>

          {/* Step summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Execution Order</p>
            {state.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-bg text-[10px] font-bold text-white">
                  {s.step_order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.source_object} → {s.target_object} · {s.field_mappings.length} fields</p>
                </div>
              </div>
            ))}
          </div>

          {/* Activate toggle */}
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium">Activate immediately</p>
              <p className="text-xs text-muted-foreground">Job will start running on its schedule right away.</p>
            </div>
            <button
              onClick={() => setState((p) => ({ ...p, is_active: !p.is_active }))}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                state.is_active ? "gradient-bg" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                state.is_active ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
              {errors.map((e) => (
                <p key={e} className="text-sm text-destructive">{e}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
