"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ArrowLeft, ArrowRight, Check, Building2, ArrowLeftRight,
  Settings, Filter, Columns, FileText, Loader2, Plus, Trash2,
  ChevronDown, Zap, RefreshCw, Sparkles, AlertTriangle, XCircle,
  CheckCircle2, ChevronRight, FlaskConical, ShieldCheck, ShieldX, TriangleAlert,
  UserCog, Users, RotateCcw, User, ArrowRightLeft, Tag,
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
  picklist_values?: { value: string; label: string }[];
}

interface FieldMapping {
  source_field: string;
  source_label: string;
  target_field: string;
  target_label: string;
}

interface OrgUser {
  id: string;
  name: string;
  email: string;
  username: string;
  profile: string;
}

type OwnerStrategy = "fixed" | "round_robin" | "passthrough";

interface OwnerConfig {
  strategy: OwnerStrategy;
  target_users: OrgUser[];
  reverse_strategy?: OwnerStrategy;
  reverse_users?: OrgUser[];
}

interface FilterRule {
  id: string;
  field: string;
  field_label: string;
  operator: string;
  value: string;
}

interface SalesforceRecordType {
  id: string;
  name: string;
  developerName: string;
  isActive: boolean;
  isMaster: boolean;
}

interface RecordTypeMapping {
  source_id: string;
  source_name: string;
  target_id: string | null;
  target_name: string | null;
}

interface RecordTypeConfig {
  strategy: "none" | "fixed" | "mapped";
  // fixed strategy
  target_record_type_id: string | null;
  target_record_type_name: string | null;
  // mapped strategy
  mappings: RecordTypeMapping[];
  // bidirectional — reverse direction
  reverse_target_record_type_id: string | null;
  reverse_target_record_type_name: string | null;
  reverse_mappings: RecordTypeMapping[];
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
  // Step 4 — Owner Assignment
  owner_config: OwnerConfig;
  // Step 5
  filters: FilterRule[];
  // Step 6 — Record Types
  record_type_config: RecordTypeConfig;
  // Step 7
  field_mappings: FieldMapping[];
  // Step 8 — Retry settings
  max_retries: number;
  retry_on_partial: boolean;
  notify_on_failure: boolean;
}

interface MappingResult {
  source_field: string;
  target_field: string;
  confidence: "high" | "medium" | "low";
  status: "ok" | "warning" | "error";
  message: string | null;
}

interface SuggestedMapping {
  source_field: string;
  source_label: string;
  target_field: string;
  target_label: string;
  reason: string;
}

interface MappingAnalysis {
  overall_score: "good" | "warning" | "error";
  summary: string;
  mapping_results: MappingResult[];
  suggested_mappings: SuggestedMapping[];
  unmapped_required_targets: { api_name: string; label: string }[];
}

interface PreflightCheck {
  status: "pass" | "warn" | "fail";
  category: string;
  message: string;
  detail?: string;
  source_field?: string;
  target_field?: string;
}

interface PreflightReport {
  overall: "ready" | "warnings" | "blocked";
  summary: string;
  sample_record: Record<string, unknown> | null;
  mapped_payload: Record<string, unknown> | null;
  checks: PreflightCheck[];
  ai_verdict: string;
}

const FILTER_OPERATORS = ["=", "!=", "contains", "starts with", "is empty", "is not empty", ">", "<", ">=", "<="];

const STEPS = [
  { id: 1, label: "Source", icon: Building2 },
  { id: 2, label: "Target", icon: Building2 },
  { id: 3, label: "Triggers", icon: Settings },
  { id: 4, label: "Owners", icon: UserCog },
  { id: 5, label: "Filters", icon: Filter },
  { id: 6, label: "Rec. Types", icon: Tag },
  { id: 7, label: "Fields", icon: Columns },
  { id: 8, label: "Retry", icon: RotateCcw },
  { id: 9, label: "Review", icon: FileText },
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
            <SearchableSelect
              options={objects.map((o) => ({ value: o.api_name, label: o.label, sublabel: o.api_name }))}
              value={selectedObject}
              onChange={onObjectSelect}
              placeholder="Search and select an object..."
              searchPlaceholder="Type to search objects..."
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Owner Assignment Step ────────────────────────────────────────────────────

const OWNER_STRATEGIES: { value: OwnerStrategy; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "fixed", label: "Fixed Owner", desc: "All new records are owned by one specific user", icon: User },
  { value: "round_robin", label: "Round Robin", desc: "Records rotate through a pool of users evenly", icon: RotateCcw },
  { value: "passthrough", label: "Pass Through", desc: "Copy OwnerId from source — may fail if user doesn't exist in target", icon: ArrowRightLeft },
];

function UserPickerPanel({
  users,
  loading,
  selected,
  strategy,
  orgLabel,
  onToggle,
}: {
  users: OrgUser[];
  loading: boolean;
  selected: OrgUser[];
  strategy: OwnerStrategy;
  orgLabel: string;
  onToggle: (u: OrgUser) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedIds = new Set(selected.map((u) => u.id));
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (strategy === "passthrough") return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {strategy === "fixed" ? `Pick owner in ${orgLabel}` : `Pick users for round-robin in ${orgLabel}`}
        </Label>
        {selected.length > 0 && (
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading users from {orgLabel}…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No active users found in {orgLabel}</p>
        </div>
      ) : (
        <>
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-xl border divide-y">
            {filtered.map((u) => {
              const isSelected = selectedIds.has(u.id);
              const isDisabled = strategy === "fixed" && selected.length > 0 && !isSelected;
              return (
                <button
                  key={u.id}
                  onClick={() => !isDisabled && onToggle(u)}
                  disabled={isDisabled}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSelected ? "bg-primary/5" : isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isSelected ? "gradient-bg text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email} · {u.profile}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Selected users preview for round robin */}
      {strategy === "round_robin" && selected.length > 1 && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Round-robin order:</p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((u, i) => (
              <span key={u.id} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                <span className="text-primary font-bold">{i + 1}</span> {u.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerStep({
  direction,
  ownerConfig,
  targetUsers,
  sourceUsers,
  loadingTargetUsers,
  loadingSourceUsers,
  targetOrgLabel,
  sourceOrgLabel,
  onChange,
}: {
  direction: "one_way" | "bidirectional";
  ownerConfig: OwnerConfig;
  targetUsers: OrgUser[];
  sourceUsers: OrgUser[];
  loadingTargetUsers: boolean;
  loadingSourceUsers: boolean;
  targetOrgLabel: string;
  sourceOrgLabel: string;
  onChange: (cfg: OwnerConfig) => void;
}) {
  function toggleUser(u: OrgUser, side: "forward" | "reverse") {
    if (side === "forward") {
      const current = ownerConfig.target_users;
      const already = current.find((x) => x.id === u.id);
      const updated = already
        ? current.filter((x) => x.id !== u.id)
        : ownerConfig.strategy === "fixed"
        ? [u] // replace for fixed
        : [...current, u];
      onChange({ ...ownerConfig, target_users: updated });
    } else {
      const current = ownerConfig.reverse_users ?? [];
      const already = current.find((x) => x.id === u.id);
      const updated = already
        ? current.filter((x) => x.id !== u.id)
        : ownerConfig.reverse_strategy === "fixed"
        ? [u]
        : [...current, u];
      onChange({ ...ownerConfig, reverse_users: updated });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Salesforce User IDs don&apos;t transfer between orgs. Choose how new records created in the target org should be owned.
        </p>
        {ownerConfig.strategy === "passthrough" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              <strong>Warning:</strong> Pass Through copies the source OwnerId directly. If that user doesn&apos;t exist in the target org, every record insert will fail with <code className="font-mono">INVALID_CROSS_REFERENCE_KEY</code>.
            </p>
          </div>
        )}
      </div>

      {/* Forward direction */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">
            Records written to <span className="text-primary">{targetOrgLabel}</span>
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {OWNER_STRATEGIES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...ownerConfig, strategy: opt.value, target_users: [] })}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                ownerConfig.strategy === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <opt.icon className={cn("h-4 w-4", ownerConfig.strategy === opt.value ? "text-primary" : "text-muted-foreground")} />
                {ownerConfig.strategy === opt.value && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="font-medium text-sm mt-2">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
        <UserPickerPanel
          users={targetUsers}
          loading={loadingTargetUsers}
          selected={ownerConfig.target_users}
          strategy={ownerConfig.strategy}
          orgLabel={targetOrgLabel}
          onToggle={(u) => toggleUser(u, "forward")}
        />
      </div>

      {/* Reverse direction (bidirectional only) */}
      {direction === "bidirectional" && (
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeft className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">
              Records written back to <span className="text-primary">{sourceOrgLabel}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">(reverse direction)</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {OWNER_STRATEGIES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...ownerConfig, reverse_strategy: opt.value, reverse_users: [] })}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                  (ownerConfig.reverse_strategy ?? "fixed") === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <opt.icon className={cn("h-4 w-4", (ownerConfig.reverse_strategy ?? "fixed") === opt.value ? "text-primary" : "text-muted-foreground")} />
                  {(ownerConfig.reverse_strategy ?? "fixed") === opt.value && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="font-medium text-sm mt-2">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
          <UserPickerPanel
            users={sourceUsers}
            loading={loadingSourceUsers}
            selected={ownerConfig.reverse_users ?? []}
            strategy={ownerConfig.reverse_strategy ?? "fixed"}
            orgLabel={sourceOrgLabel}
            onToggle={(u) => toggleUser(u, "reverse")}
          />
        </div>
      )}
    </div>
  );
}

// ─── Record Type Step ────────────────────────────────────────────────────────

const RT_STRATEGIES: { value: RecordTypeConfig["strategy"]; label: string; desc: string }[] = [
  { value: "none",   label: "No restriction", desc: "Sync records of any record type — RecordTypeId is not stamped on new records" },
  { value: "fixed",  label: "Fixed type",     desc: "All records created in the target get the same record type, regardless of source" },
  { value: "mapped", label: "Map by type",    desc: "Each source record type maps to a specific target record type" },
];

function RecordTypeStep({
  direction,
  rtConfig,
  sourceRecordTypes,
  targetRecordTypes,
  loading,
  sourceOrgLabel,
  targetOrgLabel,
  sourceObject,
  targetObject,
  onChange,
}: {
  direction: "one_way" | "bidirectional";
  rtConfig: RecordTypeConfig;
  sourceRecordTypes: SalesforceRecordType[];
  targetRecordTypes: SalesforceRecordType[];
  loading: boolean;
  sourceOrgLabel: string;
  targetOrgLabel: string;
  sourceObject: string;
  targetObject: string;
  onChange: (cfg: RecordTypeConfig) => void;
}) {
  const nonMasterTarget = targetRecordTypes.filter((rt) => !rt.isMaster);
  const nonMasterSource = sourceRecordTypes.filter((rt) => !rt.isMaster);
  const hasMultipleSourceRTs = nonMasterSource.length > 1;

  function updateMapping(sourceId: string, targetId: string | null, targetName: string | null) {
    const existing = rtConfig.mappings.find((m) => m.source_id === sourceId);
    const sourceName = sourceRecordTypes.find((rt) => rt.id === sourceId)?.name ?? sourceId;
    const updated: RecordTypeMapping[] = existing
      ? rtConfig.mappings.map((m) => m.source_id === sourceId ? { ...m, target_id: targetId, target_name: targetName } : m)
      : [...rtConfig.mappings, { source_id: sourceId, source_name: sourceName, target_id: targetId, target_name: targetName }];
    onChange({ ...rtConfig, mappings: updated });
  }

  function updateReverseMapping(sourceId: string, targetId: string | null, targetName: string | null) {
    const existing = rtConfig.reverse_mappings.find((m) => m.source_id === sourceId);
    const sourceName = targetRecordTypes.find((rt) => rt.id === sourceId)?.name ?? sourceId;
    const updated: RecordTypeMapping[] = existing
      ? rtConfig.reverse_mappings.map((m) => m.source_id === sourceId ? { ...m, target_id: targetId, target_name: targetName } : m)
      : [...rtConfig.reverse_mappings, { source_id: sourceId, source_name: sourceName, target_id: targetId, target_name: targetName }];
    onChange({ ...rtConfig, reverse_mappings: updated });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Loading record types…</span>
      </div>
    );
  }

  // If neither object has non-master record types, skip is recommended
  const noneOnEitherSide = nonMasterSource.length === 0 && nonMasterTarget.length === 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Control how <strong className="text-foreground">RecordTypeId</strong> is handled when records are created in the target org.
        {noneOnEitherSide && (
          <span className="ml-1 text-muted-foreground/70">
            Neither <span className="font-mono">{sourceObject}</span> nor <span className="font-mono">{targetObject}</span> have custom record types — you can leave this as <em>No restriction</em>.
          </span>
        )}
      </p>

      {/* Forward direction */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">
            Records written to <span className="text-primary">{targetOrgLabel}</span>
            <span className="text-muted-foreground font-normal"> ({targetObject})</span>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {RT_STRATEGIES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...rtConfig, strategy: opt.value, target_record_type_id: null, target_record_type_name: null, mappings: [] })}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                rtConfig.strategy === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <Tag className={cn("h-4 w-4", rtConfig.strategy === opt.value ? "text-primary" : "text-muted-foreground")} />
                {rtConfig.strategy === opt.value && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="font-medium text-sm mt-2">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Fixed: pick one target RT */}
        {rtConfig.strategy === "fixed" && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Record Type</Label>
            {nonMasterTarget.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground italic">No custom record types found on {targetObject} in {targetOrgLabel}.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {nonMasterTarget.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => onChange({ ...rtConfig, target_record_type_id: rt.id, target_record_type_name: rt.name })}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition-all",
                      rtConfig.target_record_type_id === rt.id ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div>
                      <span className="font-medium">{rt.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{rt.developerName}</span>
                    </div>
                    {rtConfig.target_record_type_id === rt.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mapped: row-per-source-RT → target RT picker */}
        {rtConfig.strategy === "mapped" && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Record Type Mapping</Label>
            {nonMasterSource.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground italic">No custom record types found on {sourceObject} in {sourceOrgLabel}.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {hasMultipleSourceRTs && (
                  <p className="text-xs text-muted-foreground mb-1">Select <em>None</em> to skip records with that source type.</p>
                )}
                {nonMasterSource.map((srt) => {
                  const currentMapping = rtConfig.mappings.find((m) => m.source_id === srt.id);
                  return (
                    <div key={srt.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{srt.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{srt.developerName}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="relative flex-1 min-w-0">
                        <select
                          value={currentMapping?.target_id ?? ""}
                          onChange={(e) => {
                            const trt = targetRecordTypes.find((r) => r.id === e.target.value);
                            updateMapping(srt.id, trt?.id ?? null, trt?.name ?? null);
                          }}
                          className="w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">— None (skip) —</option>
                          {nonMasterTarget.map((trt) => (
                            <option key={trt.id} value={trt.id}>{trt.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reverse direction (bidirectional only) */}
      {direction === "bidirectional" && (() => {
        const hasReverseFixed = !!rtConfig.reverse_target_record_type_id;
        const hasReverseMapped = rtConfig.reverse_mappings.length > 0;
        const reverseStrategy: RecordTypeConfig["strategy"] =
          hasReverseFixed ? "fixed" : hasReverseMapped ? "mapped" : "none";
        return (
          <div className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeft className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold">
                Records written to <span className="text-primary">{sourceOrgLabel}</span>
                <span className="text-muted-foreground font-normal"> ({sourceObject})</span>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {RT_STRATEGIES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === "none") onChange({ ...rtConfig, reverse_target_record_type_id: null, reverse_target_record_type_name: null, reverse_mappings: [] });
                    else if (opt.value === "fixed") onChange({ ...rtConfig, reverse_mappings: [] });
                    else onChange({ ...rtConfig, reverse_target_record_type_id: null, reverse_target_record_type_name: null });
                  }}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                    reverseStrategy === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Tag className={cn("h-4 w-4", reverseStrategy === opt.value ? "text-primary" : "text-muted-foreground")} />
                    {reverseStrategy === opt.value && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="font-medium text-sm mt-2">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>

            {reverseStrategy === "fixed" && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Record Type</Label>
                {sourceRecordTypes.filter(rt => !rt.isMaster).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground italic">No custom record types on {sourceObject}.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {sourceRecordTypes.filter(rt => !rt.isMaster).map((rt) => (
                      <button key={rt.id}
                        onClick={() => onChange({ ...rtConfig, reverse_target_record_type_id: rt.id, reverse_target_record_type_name: rt.name })}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition-all",
                          rtConfig.reverse_target_record_type_id === rt.id ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        <div>
                          <span className="font-medium">{rt.name}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{rt.developerName}</span>
                        </div>
                        {rtConfig.reverse_target_record_type_id === rt.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {reverseStrategy === "mapped" && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Record Type Mapping (reverse)</Label>
                <div className="mt-2 space-y-2">
                  {targetRecordTypes.filter(rt => !rt.isMaster).map((srt) => {
                    const currentMapping = rtConfig.reverse_mappings.find((m) => m.source_id === srt.id);
                    return (
                      <div key={srt.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{srt.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{srt.developerName}</p>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="relative flex-1 min-w-0">
                          <select
                            value={currentMapping?.target_id ?? ""}
                            onChange={(e) => {
                              const trt = sourceRecordTypes.find((r) => r.id === e.target.value);
                              updateReverseMapping(srt.id, trt?.id ?? null, trt?.name ?? null);
                            }}
                            className="w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">— None (skip) —</option>
                            {sourceRecordTypes.filter(rt => !rt.isMaster).map((trt) => (
                              <option key={trt.id} value={trt.id}>{trt.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
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
  const [aiAnalysis, setAiAnalysis] = useState<MappingAnalysis | null>(null);
  const [analyzingMappings, setAnalyzingMappings] = useState(false);
  const [testReport, setTestReport] = useState<PreflightReport | null>(null);
  const [runningTest, setRunningTest] = useState(false);

  // Tracking field check for step 7 (Fields)
  const [trackingFieldStatus, setTrackingFieldStatus] = useState<
    Array<{ orgId: string; orgLabel: string; object: string; exists: boolean }>
  >([]);
  const [checkingTrackingField, setCheckingTrackingField] = useState(false);
  const [creatingTrackingField, setCreatingTrackingField] = useState<string | null>(null);

  // Record type state for step 6
  const [sourceRecordTypes, setSourceRecordTypes] = useState<SalesforceRecordType[]>([]);
  const [targetRecordTypes, setTargetRecordTypes] = useState<SalesforceRecordType[]>([]);
  const [loadingRecordTypes, setLoadingRecordTypes] = useState(false);

  const [targetUsers, setTargetUsers] = useState<OrgUser[]>([]);
  const [sourceUsers, setSourceUsers] = useState<OrgUser[]>([]);
  const [loadingTargetUsers, setLoadingTargetUsers] = useState(false);
  const [loadingSourceUsers, setLoadingSourceUsers] = useState(false);

  const [planFeatures, setPlanFeatures] = useState<{
    can_use_filters: boolean;
    can_use_bidirectional: boolean;
    can_use_delete_sync: boolean;
    can_use_ai: boolean;
  }>({
    can_use_filters: true,
    can_use_bidirectional: true,
    can_use_delete_sync: true,
    can_use_ai: true,
  });

  const [state, setState] = useState<BuilderState>({
    name: "",
    source_org_id: "", source_object: "",
    target_org_id: "", target_object: "",
    direction: "one_way",
    trigger_on_create: true, trigger_on_update: false, trigger_on_delete: false,
    owner_config: { strategy: "fixed", target_users: [], reverse_strategy: "fixed", reverse_users: [] },
    filters: [],
    record_type_config: {
      strategy: "none",
      target_record_type_id: null, target_record_type_name: null,
      mappings: [],
      reverse_target_record_type_id: null, reverse_target_record_type_name: null,
      reverse_mappings: [],
    },
    field_mappings: [],
    max_retries: 3,
    retry_on_partial: true,
    notify_on_failure: true,
  });

  // Load orgs + plan features on mount + check for NL prefill
  useEffect(() => {
    fetch("/api/salesforce/orgs")
      .then((r) => r.json())
      .then((d) => setOrgs(d.orgs ?? []));

    // Load plan features for UI gating
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        const tier = d.customer?.plan_tier ?? "starter";
        fetch(`/api/plan-features?tier=${tier}`)
          .then((r) => r.json())
          .then((pf) => {
            if (pf && !pf.error) setPlanFeatures({
              can_use_filters: pf.can_use_filters ?? true,
              can_use_bidirectional: pf.can_use_bidirectional ?? true,
              can_use_delete_sync: pf.can_use_delete_sync ?? true,
              can_use_ai: pf.can_use_ai ?? true,
            });
          })
          .catch(() => {});
      })
      .catch(() => {});

    // Check for AI natural language prefill
    const prefill = sessionStorage.getItem("nl_prefill");
    if (prefill) {
      try {
        const cfg = JSON.parse(prefill);
        sessionStorage.removeItem("nl_prefill");
        setState((prev) => ({
          ...prev,
          name: cfg.name ?? prev.name,
          source_object: cfg.source_object ?? prev.source_object,
          target_object: cfg.target_object ?? prev.target_object,
          direction: cfg.direction ?? prev.direction,
          trigger_on_create: cfg.trigger_on_create ?? prev.trigger_on_create,
          trigger_on_update: cfg.trigger_on_update ?? prev.trigger_on_update,
          trigger_on_delete: cfg.trigger_on_delete ?? prev.trigger_on_delete,
          field_mappings: cfg.field_mappings ?? prev.field_mappings,
          filters: cfg.filters ?? prev.filters,
        }));
        // Jump to review step since AI has filled everything
        setStep(6);
        toast.success("AI pre-filled your sync config — review and save");
      } catch {
        sessionStorage.removeItem("nl_prefill");
      }
    }
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

      // Auto-match fields by exact API name (case-sensitive, character-for-character)
      // Only maps when: api_name is identical, target is createable, and field types match
      if (state.field_mappings.length === 0) {
        const tgtFieldMap = new Map<string, OrgField>((tgtData.fields ?? []).map((f: OrgField) => [f.api_name, f]));
        const autoMapped: FieldMapping[] = [];
        for (const sf of (srcData.fields ?? []) as OrgField[]) {
          const tf = tgtFieldMap.get(sf.api_name); // exact key lookup — no fuzzy, no case-folding
          if (
            tf &&
            tf.is_createable &&
            tf.api_name === sf.api_name && // redundant but explicit: must be character-for-character identical
            tf.field_type === sf.field_type && // types must match — same name, different type = skip
            sf.api_name !== "OwnerId" // handled by the Owners step — never auto-map
          ) {
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
          toast.success(`Auto-matched ${autoMapped.length} field${autoMapped.length !== 1 ? "s" : ""} by exact API name`);
        }
      }
    } finally {
      setLoadingSourceFields(false);
      setLoadingTargetFields(false);
    }
  }, [state.source_org_id, state.source_object, state.target_org_id, state.target_object, state.field_mappings.length]);

  const loadRecordTypes = useCallback(async () => {
    if (!state.source_org_id || !state.source_object || !state.target_org_id || !state.target_object) return;
    setLoadingRecordTypes(true);
    try {
      const [srcRes, tgtRes] = await Promise.all([
        fetch(`/api/salesforce/orgs/${state.source_org_id}/objects/${state.source_object}/record-types`),
        fetch(`/api/salesforce/orgs/${state.target_org_id}/objects/${state.target_object}/record-types`),
      ]);
      const [srcData, tgtData] = await Promise.all([srcRes.json(), tgtRes.json()]);
      setSourceRecordTypes(srcData.recordTypes ?? []);
      setTargetRecordTypes(tgtData.recordTypes ?? []);
    } finally {
      setLoadingRecordTypes(false);
    }
  }, [state.source_org_id, state.source_object, state.target_org_id, state.target_object]);

  const loadUsers = useCallback(async () => {
    if (state.target_org_id) {
      setLoadingTargetUsers(true);
      try {
        const res = await fetch(`/api/salesforce/orgs/${state.target_org_id}/users`);
        const data = await res.json();
        setTargetUsers(data.users ?? []);
      } finally {
        setLoadingTargetUsers(false);
      }
    }
    if (state.direction === "bidirectional" && state.source_org_id) {
      setLoadingSourceUsers(true);
      try {
        const res = await fetch(`/api/salesforce/orgs/${state.source_org_id}/users`);
        const data = await res.json();
        setSourceUsers(data.users ?? []);
      } finally {
        setLoadingSourceUsers(false);
      }
    }
  }, [state.target_org_id, state.source_org_id, state.direction]);

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

  async function analyzeMappings() {
    if (state.field_mappings.length === 0) return;
    setAnalyzingMappings(true);
    try {
      const res = await fetch("/api/ai/analyze-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: state.field_mappings,
          sourceFields,
          targetFields,
          sourceObject: state.source_object,
          targetObject: state.target_object,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiAnalysis(data.analysis);
    } catch {
      toast.error("AI analysis failed — check your API key");
    } finally {
      setAnalyzingMappings(false);
    }
  }

  async function runTestSync() {
    setRunningTest(true);
    setTestReport(null);
    try {
      const res = await fetch("/api/ai/test-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_org_id: state.source_org_id,
          target_org_id: state.target_org_id,
          source_object: state.source_object,
          target_object: state.target_object,
          field_mappings: state.field_mappings,
          filters: state.filters.map(({ field, operator, value }) => ({ field, operator, value })),
          direction: state.direction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestReport(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test run failed");
    } finally {
      setRunningTest(false);
    }
  }

  function acceptSuggestedMapping(suggestion: SuggestedMapping) {
    setState((prev) => ({
      ...prev,
      field_mappings: [...prev.field_mappings, {
        source_field: suggestion.source_field,
        source_label: suggestion.source_label,
        target_field: suggestion.target_field,
        target_label: suggestion.target_label,
      }],
    }));
    // Remove from suggestions
    setAiAnalysis((prev) => prev ? {
      ...prev,
      suggested_mappings: prev.suggested_mappings.filter(
        (s) => s.source_field !== suggestion.source_field || s.target_field !== suggestion.target_field
      ),
    } : null);
    toast.success(`Added ${suggestion.source_label} → ${suggestion.target_label}`);
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
          owner_config: state.owner_config,
          filters: state.filters.map(({ field, operator, value }) => ({ field, operator, value })),
          record_type_config: state.record_type_config,
          field_mappings: state.field_mappings,
          max_retries: state.max_retries,
          retry_on_partial: state.retry_on_partial,
          notify_on_failure: state.notify_on_failure,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Sync configuration created!");

      // Fire-and-forget AI summary — never blocks navigation
      if (data.sync?.id) {
        fetch("/api/ai/summarize-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sync_id: data.sync.id,
            source_org_label: orgs.find((o) => o.id === state.source_org_id)?.label ?? state.source_org_id,
            target_org_label: orgs.find((o) => o.id === state.target_org_id)?.label ?? state.target_org_id,
            source_object: state.source_object,
            target_object: state.target_object,
            direction: state.direction,
            trigger_on_create: state.trigger_on_create,
            trigger_on_update: state.trigger_on_update,
            trigger_on_delete: state.trigger_on_delete,
            field_mappings: state.field_mappings,
            filters: state.filters,
          }),
        }).catch(() => {}); // silent — summary is non-critical
      }

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
    if (step === 4) {
      // Must have at least one target user selected for non-passthrough strategies
      if (state.owner_config.strategy !== "passthrough" && state.owner_config.target_users.length === 0) return false;
      if (state.direction === "bidirectional" && state.owner_config.reverse_strategy !== "passthrough" && (state.owner_config.reverse_users ?? []).length === 0) return false;
      return true;
    }
    if (step === 9) return !!state.name.trim() && state.field_mappings.length > 0;
    return true;
  }

  function goNext() {
    if (step === 3) loadUsers();
    if (step === 2 && state.field_mappings.length === 0) loadFields();
    // Load record types when entering Record Types step (step 6)
    if (step === 5) loadRecordTypes();
    // Load fields + check tracking field when entering Fields step (step 7)
    if (step === 6) {
      if (state.field_mappings.length === 0) loadFields();
      checkTrackingFields();
    }
    setStep((s) => s + 1);
  }

  async function checkTrackingFields() {
    if (!state.target_org_id || !state.target_object) return;
    setCheckingTrackingField(true);
    setTrackingFieldStatus([]);
    try {
      const toCheck = [
        { orgId: state.target_org_id, object: state.target_object },
        ...(state.direction === "bidirectional" && state.source_org_id && state.source_object
          ? [{ orgId: state.source_org_id, object: state.source_object }]
          : []),
      ];

      const results = await Promise.all(
        toCheck.map(async ({ orgId, object }) => {
          const org = orgs.find((o) => o.id === orgId);
          const orgLabel = org?.label ?? orgId;
          try {
            const res = await fetch(
              `/api/salesforce/orgs/${orgId}/objects/${object}/fields`
            );
            const data = await res.json();
            const exists = (data.fields ?? []).some(
              (f: { api_name: string }) => f.api_name === "OrgSync_Source_Id__c"
            );
            return { orgId, orgLabel, object, exists };
          } catch {
            return { orgId, orgLabel, object, exists: false };
          }
        })
      );
      setTrackingFieldStatus(results);
    } finally {
      setCheckingTrackingField(false);
    }
  }

  async function handleCreateTrackingField(orgId: string, sobjectType: string) {
    const key = `${orgId}:${sobjectType}`;
    setCreatingTrackingField(key);
    try {
      const res = await fetch(
        `/api/salesforce/orgs/${orgId}/ensure-external-id-field`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sobjectType }),
        }
      );
      const data = await res.json();
      if (data.status === "error") {
        toast.error(data.message ?? "Failed to create tracking field");
        return;
      }
      toast.success(`Tracking field created on ${sobjectType} — syncs will update records correctly`);
      setTrackingFieldStatus((prev) =>
        prev.map((f) =>
          f.orgId === orgId && f.object === sobjectType ? { ...f, exists: true } : f
        )
      );
    } catch {
      toast.error("Failed to create tracking field");
    } finally {
      setCreatingTrackingField(null);
    }
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

      case 2: {
        const sourceOrg = orgs.find((o) => o.id === state.source_org_id);
        const isSameOrg = state.target_org_id === state.source_org_id;
        return (
          <div className="space-y-4">
            {/* Contextual hint */}
            {sourceOrg && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
                <ArrowLeftRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Tip: </span>
                  {isSameOrg ? (
                    <>You&apos;ve selected <span className="font-medium text-foreground">{sourceOrg.label}</span> as the target — that&apos;s fine. This is an <span className="font-medium text-foreground">internal transfer</span>, syncing data between two different objects within the same org.</>
                  ) : (
                    <>Select a <span className="font-medium text-foreground">different org</span> to sync data across orgs. Or pick <span className="font-medium text-foreground">{sourceOrg.label}</span> again to do an <span className="font-medium text-foreground">internal transfer</span> between two objects in the same org — both are supported.</>
                  )}
                </div>
              </div>
            )}
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
            />
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Sync Direction</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  { value: "one_way", label: "One-Way", desc: `${orgs.find(o => o.id === state.source_org_id)?.label ?? "Source"} → ${orgs.find(o => o.id === state.target_org_id)?.label ?? "Target"}`, locked: false },
                  { value: "bidirectional", label: "Bidirectional", desc: "Changes in either org sync to the other", locked: !planFeatures.can_use_bidirectional },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => !opt.locked && setState((p) => ({ ...p, direction: opt.value }))}
                    disabled={opt.locked}
                    className={cn(
                      "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      opt.locked ? "opacity-50 cursor-not-allowed bg-muted/30" :
                      state.direction === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <ArrowLeftRight className={cn("mt-0.5 h-4 w-4 shrink-0", state.direction === opt.value && !opt.locked ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{opt.label}</p>
                        {opt.locked && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 border border-primary/30 bg-primary/5 px-1.5 py-0.5 rounded-full">Growth</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {state.direction === opt.value && !opt.locked && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Trigger On</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Which record events should trigger a sync</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { key: "trigger_on_create" as const, label: "Record Created", desc: "New record in source org", locked: false },
                  { key: "trigger_on_update" as const, label: "Record Updated", desc: "Field changes in source org", locked: false },
                  { key: "trigger_on_delete" as const, label: "Record Deleted", desc: "Record removed from source org", locked: !planFeatures.can_use_delete_sync },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => !opt.locked && setState((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    disabled={opt.locked}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                      opt.locked ? "opacity-50 cursor-not-allowed bg-muted/30" :
                      state[opt.key] ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Zap className={cn("h-4 w-4", state[opt.key] && !opt.locked ? "text-primary" : "text-muted-foreground")} />
                      {opt.locked
                        ? <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 border border-primary/30 bg-primary/5 px-1.5 py-0.5 rounded-full">Growth</span>
                        : state[opt.key] && <Check className="h-4 w-4 text-primary" />
                      }
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
        return <OwnerStep
          direction={state.direction}
          ownerConfig={state.owner_config}
          targetUsers={targetUsers}
          sourceUsers={sourceUsers}
          loadingTargetUsers={loadingTargetUsers}
          loadingSourceUsers={loadingSourceUsers}
          targetOrgLabel={orgs.find(o => o.id === state.target_org_id)?.label ?? "Target Org"}
          sourceOrgLabel={orgs.find(o => o.id === state.source_org_id)?.label ?? "Source Org"}
          onChange={(cfg) => setState((p) => ({ ...p, owner_config: cfg }))}
        />;

      case 5:
        return (
          <div className="space-y-4">
            {!planFeatures.can_use_filters && (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-semibold text-foreground">Filters are a Growth plan feature</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upgrade to Growth to restrict which records sync based on field values.
                </p>
                <a
                  href="/pricing"
                  target="_blank"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  View plans
                </a>
              </div>
            )}
            {planFeatures.can_use_filters && (
            <div>
              <p className="text-sm text-muted-foreground">
                Only sync records that match ALL of these conditions. Leave empty to sync all records.
              </p>
            </div>
            )}
            {planFeatures.can_use_filters && state.filters.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium">No filters — all records will sync</p>
                <p className="mt-1 text-xs text-muted-foreground">Add a filter to restrict which records get synced</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={addFilter}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Filter
                </Button>
              </div>
            ) : planFeatures.can_use_filters ? (
              <div className="space-y-3">
                {state.filters.map((filter, i) => {
                  const selectedField = sourceFields.find((f) => f.api_name === filter.field);
                  const isPicklist = selectedField?.field_type === "picklist" || selectedField?.field_type === "multipicklist";
                  const picklistOptions = selectedField?.picklist_values ?? [];
                  const showValueInput = !["is empty", "is not empty"].includes(filter.operator);
                  return (
                  <div key={filter.id} className="flex items-center gap-2 flex-wrap">
                    {i > 0 && <span className="text-xs font-medium text-muted-foreground w-8">AND</span>}
                    {i === 0 && <span className="text-xs font-medium text-muted-foreground w-8">IF</span>}
                    <div className="relative">
                      <select
                        value={filter.field}
                        onChange={(e) => {
                          const newField = sourceFields.find((f) => f.api_name === e.target.value);
                          updateFilter(filter.id, "field", e.target.value);
                          // Clear value when switching fields so stale picklist values don't persist
                          if (newField?.api_name !== filter.field) {
                            updateFilter(filter.id, "value", "");
                          }
                        }}
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
                    {showValueInput && (
                      isPicklist && picklistOptions.length > 0 ? (
                        <div className="relative">
                          <select
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                            className="h-9 w-44 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">— select value —</option>
                            {picklistOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      ) : (
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                          placeholder="Value"
                          className="h-9 w-40"
                        />
                      )
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeFilter(filter.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Condition
                </Button>
              </div>
            ) : null}
          </div>
        );

      case 6:
        return (
          <RecordTypeStep
            direction={state.direction}
            rtConfig={state.record_type_config}
            sourceRecordTypes={sourceRecordTypes}
            targetRecordTypes={targetRecordTypes}
            loading={loadingRecordTypes}
            sourceOrgLabel={orgs.find(o => o.id === state.source_org_id)?.label ?? "Source Org"}
            targetOrgLabel={orgs.find(o => o.id === state.target_org_id)?.label ?? "Target Org"}
            sourceObject={state.source_object}
            targetObject={state.target_object}
            onChange={(cfg) => setState((p) => ({ ...p, record_type_config: cfg }))}
          />
        );

      case 7:
        return (
          <div className="space-y-4">

            {/* Tracking field status banner */}
            {checkingTrackingField && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                Checking OrgSync tracking field…
              </div>
            )}

            {!checkingTrackingField && trackingFieldStatus.map((tf) => (
              tf.exists ? (
                <div key={`${tf.orgId}:${tf.object}`} className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span><span className="font-mono font-semibold">OrgSync_Source_Id__c</span> is ready on <span className="font-semibold">{tf.object}</span> in {tf.orgLabel} — records will update correctly, no duplicates.</span>
                </div>
              ) : (
                <div key={`${tf.orgId}:${tf.object}`} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-800">Tracking field missing on <span className="font-mono">{tf.object}</span> in {tf.orgLabel}</p>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      OrgSync needs a custom field <span className="font-mono font-medium">OrgSync_Source_Id__c</span> on this object to know whether to update an existing record or create a new one. Without it, repeat syncs may create duplicates.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateTrackingField(tf.orgId, tf.object)}
                    disabled={creatingTrackingField === `${tf.orgId}:${tf.object}`}
                    className="shrink-0 flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {creatingTrackingField === `${tf.orgId}:${tf.object}`
                      ? <><Loader2 className="h-3 w-3 animate-spin" />Creating…</>
                      : <>Create Field</>
                    }
                  </button>
                </div>
              )
            ))}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Map source fields to target fields. Fields with matching API names were auto-matched.
              </p>
              {state.field_mappings.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeMappings}
                  disabled={analyzingMappings}
                  className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                >
                  {analyzingMappings
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  Analyze with AI
                </Button>
              )}
            </div>

            {/* AI Analysis Panel */}
            {aiAnalysis && (
              <div className={cn(
                "rounded-xl border p-4 space-y-3",
                aiAnalysis.overall_score === "good" && "border-green-200 bg-green-50/50",
                aiAnalysis.overall_score === "warning" && "border-yellow-200 bg-yellow-50/50",
                aiAnalysis.overall_score === "error" && "border-red-200 bg-red-50/50",
              )}>
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Analysis</span>
                  </div>
                  {aiAnalysis.overall_score === "good" && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                  {aiAnalysis.overall_score === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />}
                  {aiAnalysis.overall_score === "error" && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                  <p className="text-sm">{aiAnalysis.summary}</p>
                </div>

                {/* Unmapped required fields */}
                {aiAnalysis.unmapped_required_targets.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-xs font-medium text-red-700 mb-1">Required target fields not mapped:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.unmapped_required_targets.map((f) => (
                        <Badge key={f.api_name} variant="outline" className="text-xs border-red-300 text-red-700">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested mappings */}
                {aiAnalysis.suggested_mappings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">AI Suggested Mappings:</p>
                    {aiAnalysis.suggested_mappings.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium truncate">{s.source_label}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium truncate">{s.target_label}</span>
                          <span className="text-xs text-muted-foreground hidden sm:block">— {s.reason}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                          onClick={() => acceptSuggestedMapping(s)}
                        >
                          <Plus className="h-3 w-3 mr-1" />Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(loadingSourceFields || loadingTargetFields) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-x-3 gap-y-3 items-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source Field</div>
                  <div />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Field</div>
                  <div />
                  <div />
                  {state.field_mappings.map((mapping, i) => {
                    const aiResult = aiAnalysis?.mapping_results.find(
                      (r) => r.source_field === mapping.source_field && r.target_field === mapping.target_field
                    );
                    return (
                      <>
                        <div key={`src-${i}`} className="relative">
                          <select
                            value={mapping.source_field}
                            onChange={(e) => { updateMapping(i, "source_field", e.target.value); setAiAnalysis(null); }}
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
                            onChange={(e) => { updateMapping(i, "target_field", e.target.value); setAiAnalysis(null); }}
                            className={cn(
                              "w-full h-9 rounded-lg border bg-background pl-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                              aiResult?.status === "error" && "border-red-400",
                              aiResult?.status === "warning" && "border-yellow-400",
                            )}
                          >
                            {targetFields.filter((f) => f.is_createable || f.is_updateable).map((f) => (
                              <option key={f.api_name} value={f.api_name}>{f.label} ({f.api_name})</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        {/* AI status icon per row */}
                        <div key={`ai-${i}`} className="flex items-center justify-center w-5">
                          {aiResult?.status === "error" && (
                            <XCircle className="h-4 w-4 text-red-500" aria-label={aiResult.message ?? ""} />
                          )}
                          {aiResult?.status === "warning" && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-label={aiResult.message ?? ""} />
                          )}
                          {aiResult?.status === "ok" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <Button key={`del-${i}`} variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => { removeMapping(i); setAiAnalysis(null); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    );
                  })}
                </div>

                {/* Per-mapping AI messages */}
                {aiAnalysis && aiAnalysis.mapping_results.some((r) => r.message) && (
                  <div className="space-y-1.5">
                    {aiAnalysis.mapping_results.filter((r) => r.message).map((r, i) => (
                      <div key={i} className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                        r.status === "error" && "bg-red-50 text-red-700",
                        r.status === "warning" && "bg-yellow-50 text-yellow-700",
                      )}>
                        {r.status === "error" ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                        <span><strong>{r.source_field} → {r.target_field}:</strong> {r.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={addMapping}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add Mapping
                </Button>
              </>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold">Retry Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Control how the system handles failed records automatically.
              </p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Max Automatic Retries</Label>
              <p className="text-xs text-muted-foreground -mt-1">How many times the worker auto-retries a failed record. After this, the record is abandoned until you manually retry.</p>
              <div className="flex items-center gap-3">
                {[0, 1, 3, 5, 10].map((n) => (
                  <button key={n} onClick={() => setState((p) => ({ ...p, max_retries: n }))}
                    className={cn("h-10 w-14 rounded-xl border text-sm font-semibold transition-all",
                      state.max_retries === n ? "gradient-bg text-white border-transparent shadow-sm" : "hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                    )}>
                    {n === 0 ? "Off" : `×${n}`}
                  </button>
                ))}
              </div>
              {state.max_retries === 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">Auto-retry is off. Failed records stay failed until you manually retry from the Logs page.</p>
                </div>
              )}
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Retry on Partial Runs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Auto-retry failures even when the same run had some successes.</p>
                </div>
                <button onClick={() => setState((p) => ({ ...p, retry_on_partial: !p.retry_on_partial }))}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    state.retry_on_partial ? "gradient-bg" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                    state.retry_on_partial ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Highlight Failures in Dashboard</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Show a prominent alert on your dashboard when this sync has unresolved failures.</p>
                </div>
                <button onClick={() => setState((p) => ({ ...p, notify_on_failure: !p.notify_on_failure }))}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    state.notify_on_failure ? "gradient-bg" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                    state.notify_on_failure ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
              <RotateCcw className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can always manually retry individual records or entire failed runs from the <strong className="text-foreground">Logs</strong> page — regardless of these settings.
              </p>
            </div>
          </div>
        );

      case 9:
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

            {/* Config Summary */}
            <div className="rounded-xl border divide-y">
              {[
                { label: "Source", value: `${orgs.find(o => o.id === state.source_org_id)?.label} → ${state.source_object}` },
                { label: "Target", value: `${orgs.find(o => o.id === state.target_org_id)?.label} → ${state.target_object}` },
                { label: "Direction", value: state.direction === "bidirectional" ? "Bidirectional" : "One-Way" },
                { label: "Triggers", value: [state.trigger_on_create && "Create", state.trigger_on_update && "Update", state.trigger_on_delete && "Delete"].filter(Boolean).join(", ") },
                {
                  label: "Owner (Target)",
                  value: state.owner_config.strategy === "passthrough"
                    ? "Pass through source OwnerId"
                    : state.owner_config.strategy === "fixed" && state.owner_config.target_users[0]
                    ? `Fixed: ${state.owner_config.target_users[0].name}`
                    : state.owner_config.strategy === "round_robin" && state.owner_config.target_users.length > 0
                    ? `Round robin: ${state.owner_config.target_users.map(u => u.name).join(", ")}`
                    : "Not configured",
                },
                { label: "Filters", value: state.filters.length > 0 ? `${state.filters.length} condition${state.filters.length > 1 ? "s" : ""}` : "None (sync all records)" },
                {
                  label: "Record Types",
                  value: state.record_type_config.strategy === "none"
                    ? "No restriction (sync all record types)"
                    : state.record_type_config.strategy === "fixed" && state.record_type_config.target_record_type_name
                    ? `Fixed: ${state.record_type_config.target_record_type_name}`
                    : state.record_type_config.strategy === "mapped"
                    ? `${state.record_type_config.mappings.filter(m => m.target_id).length} type${state.record_type_config.mappings.filter(m => m.target_id).length !== 1 ? "s" : ""} mapped`
                    : "Configured",
                },
                { label: "Field Mappings", value: `${state.field_mappings.length} field${state.field_mappings.length !== 1 ? "s" : ""} mapped` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Test Run Panel */}
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
                  onClick={runTestSync}
                  disabled={runningTest || !state.source_org_id || !state.target_org_id}
                  className="shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  {runningTest
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running...</>
                    : <><FlaskConical className="h-3.5 w-3.5" />Run Test</>}
                </Button>
              </div>

              {testReport && (
                <div className="p-4 space-y-4">
                  {/* Overall verdict banner */}
                  <div className={cn(
                    "flex items-start gap-3 rounded-lg p-3",
                    testReport.overall === "ready" && "bg-green-50 border border-green-200",
                    testReport.overall === "warnings" && "bg-yellow-50 border border-yellow-200",
                    testReport.overall === "blocked" && "bg-red-50 border border-red-200",
                  )}>
                    {testReport.overall === "ready" && <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                    {testReport.overall === "warnings" && <TriangleAlert className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />}
                    {testReport.overall === "blocked" && <ShieldX className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className={cn(
                        "text-sm font-semibold",
                        testReport.overall === "ready" && "text-green-800",
                        testReport.overall === "warnings" && "text-yellow-800",
                        testReport.overall === "blocked" && "text-red-800",
                      )}>
                        {testReport.overall === "ready" && "Ready to activate"}
                        {testReport.overall === "warnings" && "Ready with warnings"}
                        {testReport.overall === "blocked" && "Blocked — fix issues before activating"}
                      </p>
                      <p className="text-xs mt-0.5 text-muted-foreground">{testReport.ai_verdict}</p>
                    </div>
                  </div>

                  {/* Check list */}
                  <div className="space-y-1.5">
                    {testReport.checks.map((check, i) => {
                      const canRemove =
                        check.category === "Mappings" &&
                        (check.status === "warn" || check.status === "fail") &&
                        check.source_field &&
                        check.target_field;

                      return (
                        <div key={i} className={cn(
                          "flex items-start gap-2.5 text-xs rounded-lg px-2 py-1.5 -mx-2",
                          canRemove && "group hover:bg-muted/40 transition-colors"
                        )}>
                          {check.status === "pass" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
                          {check.status === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                          {check.status === "fail" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "font-medium",
                              check.status === "pass" && "text-green-700",
                              check.status === "warn" && "text-yellow-700",
                              check.status === "fail" && "text-red-700",
                            )}>{check.category}: </span>
                            <span className="text-muted-foreground">{check.message}</span>
                            {check.detail && (
                              <p className="mt-0.5 text-muted-foreground/70 font-mono text-[10px] break-all">{check.detail}</p>
                            )}
                          </div>
                          {canRemove && (
                            <button
                              onClick={() => {
                                setState((prev) => ({
                                  ...prev,
                                  field_mappings: prev.field_mappings.filter(
                                    (m) => !(m.source_field === check.source_field && m.target_field === check.target_field)
                                  ),
                                }));
                                setTestReport(null);
                                setTimeout(() => runTestSync(), 50);
                              }}
                              className="ml-2 shrink-0 rounded px-2 py-0.5 text-[10px] font-medium border border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Remove &amp; retest
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Simulated payload preview */}
                  {testReport.mapped_payload && Object.keys(testReport.mapped_payload).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Simulated Payload (not written)</p>
                      <div className="rounded-lg border bg-muted/30 divide-y max-h-48 overflow-y-auto">
                        {Object.entries(testReport.mapped_payload).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
                            <span className="font-mono text-muted-foreground shrink-0">{k}</span>
                            <span className="truncate text-right font-medium">{v === null ? <em className="text-muted-foreground">null</em> : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!testReport && !runningTest && (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-muted-foreground">Run a test to validate your configuration before going live.</p>
                </div>
              )}
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

        {step < 9 ? (
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
