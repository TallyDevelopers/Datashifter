"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  Database,
  Loader2,
  RefreshCw,
  ChevronRight,
  Tag,
  Lock,
  Pencil,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrgObject {
  id: string;
  api_name: string;
  label: string;
  is_custom: boolean;
  is_queryable: boolean;
  last_synced_at: string;
}

interface OrgField {
  id?: string;
  api_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_createable: boolean;
  is_updateable: boolean;
  reference_to: string[] | null;
}

const FIELD_TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-100 text-blue-700",
  textarea: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  phone: "bg-purple-100 text-purple-700",
  url: "bg-purple-100 text-purple-700",
  boolean: "bg-green-100 text-green-700",
  double: "bg-amber-100 text-amber-700",
  integer: "bg-amber-100 text-amber-700",
  currency: "bg-amber-100 text-amber-700",
  percent: "bg-amber-100 text-amber-700",
  date: "bg-orange-100 text-orange-700",
  datetime: "bg-orange-100 text-orange-700",
  time: "bg-orange-100 text-orange-700",
  picklist: "bg-pink-100 text-pink-700",
  multipicklist: "bg-pink-100 text-pink-700",
  reference: "bg-indigo-100 text-indigo-700",
  id: "bg-gray-100 text-gray-700",
};

function FieldTypeBadge({ type }: { type: string }) {
  const colorClass = FIELD_TYPE_COLORS[type.toLowerCase()] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {type}
    </span>
  );
}

export default function ObjectBrowserPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const [orgLabel, setOrgLabel] = useState<string>("");
  const [objects, setObjects] = useState<OrgObject[]>([]);
  const [filtered, setFiltered] = useState<OrgObject[]>([]);
  const [search, setSearch] = useState("");
  const [customOnly, setCustomOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState<OrgObject | null>(null);
  const [fields, setFields] = useState<OrgField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${orgId}/objects`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setObjects(data.objects ?? []);
      setFiltered(data.objects ?? []);
      setOrgLabel(data.orgLabel ?? "");
    } catch {
      toast.error("Failed to load objects");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    let result = objects;
    if (customOnly) result = result.filter((o) => o.is_custom);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.api_name.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, customOnly, objects]);

  async function fetchFields(obj: OrgObject, refresh = false) {
    setSelectedObject(obj);
    setFields([]);
    setFieldSearch("");
    setLoadingFields(true);
    try {
      const url = `/api/salesforce/orgs/${orgId}/objects/${obj.api_name}/fields${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFields(data.fields ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load fields");
    } finally {
      setLoadingFields(false);
    }
  }

  const filteredFields = fieldSearch
    ? fields.filter(
        (f) =>
          f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
          f.api_name.toLowerCase().includes(fieldSearch.toLowerCase())
      )
    : fields;

  const customCount = objects.filter((o) => o.is_custom).length;
  const standardCount = objects.length - customCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orgs">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Orgs
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{orgLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {objects.length} objects &middot; {standardCount} standard &middot; {customCount} custom
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchObjects()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search objects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={customOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setCustomOnly(!customOnly)}
          className={customOnly ? "gradient-bg border-0 text-white hover:opacity-90" : ""}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Custom Only
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="h-10 w-10 text-muted-foreground/30" />
            <h3 className="mt-4 text-sm font-semibold">
              {objects.length === 0 ? "No objects synced yet" : "No objects match your search"}
            </h3>
            {objects.length === 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Go back to Connected Orgs and click &ldquo;Sync Metadata&rdquo; on this org first.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((obj) => (
              <button
                key={obj.id}
                onClick={() => fetchFields(obj)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${obj.is_custom ? "bg-primary/10" : "bg-muted"}`}>
                    {obj.is_custom ? (
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{obj.label}</span>
                      {obj.is_custom && (
                        <Badge variant="secondary" className="text-xs shrink-0">Custom</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{obj.api_name}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Field Detail Sheet */}
      <Sheet open={!!selectedObject} onOpenChange={(open) => !open && setSelectedObject(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              {selectedObject?.label}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {selectedObject?.api_name}
            </SheetDescription>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedObject && fetchFields(selectedObject, true)}
                disabled={loadingFields}
              >
                <RefreshCw className={`mr-1.5 h-3 w-3 ${loadingFields ? "animate-spin" : ""}`} />
                Refresh Fields
              </Button>
              <span className="text-xs text-muted-foreground">
                {fields.length} fields
              </span>
            </div>
          </SheetHeader>

          <div className="mt-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingFields ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Req</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFields.map((field) => (
                    <TableRow key={field.api_name}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{field.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{field.api_name}</p>
                          {field.reference_to && field.reference_to.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              → {field.reference_to.join(", ")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FieldTypeBadge type={field.field_type} />
                      </TableCell>
                      <TableCell className="text-center">
                        {field.is_required ? (
                          <span className="text-destructive font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.is_createable ? (
                          <span className="text-green-600 text-sm">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.is_updateable ? (
                          <span className="text-green-600 text-sm">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
