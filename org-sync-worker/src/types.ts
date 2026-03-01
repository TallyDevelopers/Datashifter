export interface ConnectedOrg {
  id: string;
  customer_id: string;
  org_id: string;
  instance_url: string;
  access_token: string;   // encrypted
  refresh_token: string;  // encrypted
  token_expires_at: string | null;
  label: string;
  is_sandbox: boolean;
  status: string;
}

export interface FieldMapping {
  source_field: string;
  target_field: string;
  source_label?: string;
  target_label?: string;
}

export interface SyncFilter {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_null" | "is_not_null";
  value: string;
}

export interface SyncConfig {
  id: string;
  customer_id: string;
  name: string;
  source_org_id: string;
  source_object: string;
  target_org_id: string;
  target_object: string;
  direction: "one_way" | "bidirectional";
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_delete: boolean;
  filters: SyncFilter[];
  field_mappings: FieldMapping[];
  is_active: boolean;
  source_org: ConnectedOrg;
  target_org: ConnectedOrg;
}

export interface SyncLogRow {
  id: string;
  sync_config_id: string;
  status: "running" | "success" | "partial" | "failed";
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  error_details: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface RecordMapping {
  sync_config_id: string;
  source_org_id: string;
  source_record_id: string;
  target_org_id: string;
  target_record_id: string;
}

export interface SalesforceRecord {
  Id?: string;
  [key: string]: unknown;
}

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: SalesforceRecord[];
  nextRecordsUrl?: string;
}

export interface SalesforceUpsertResult {
  id: string;
  success: boolean;
  errors: Array<{ message: string; errorCode: string }>;
  created?: boolean;
}

export interface SalesforceCompositeSubrequest {
  method: "POST" | "PATCH" | "GET" | "DELETE";
  url: string;
  referenceId: string;
  body?: Record<string, unknown>;
}

export interface SalesforceCompositeResponse {
  compositeResponse: Array<{
    body: unknown;
    httpHeaders: Record<string, string>;
    httpStatusCode: number;
    referenceId: string;
  }>;
}

export interface RunResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    sourceRecordId: string;
    errorMessage: string;
    errorCode: string;
  }>;
}
