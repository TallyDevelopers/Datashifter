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

export type OwnerStrategy = "fixed" | "round_robin" | "passthrough";

export interface OwnerUser {
  id: string;    // Salesforce User Id (005...)
  name: string;
  email: string;
}

/**
 * Determines how OwnerId is set on records written to the target org.
 *
 * fixed       — all records owned by target_users[0]
 * round_robin — records rotated through target_users in order
 * passthrough — source OwnerId copied as-is (may fail cross-org)
 *
 * For bidirectional syncs, reverse_strategy / reverse_users control
 * ownership when writing back to the SOURCE org.
 */
export interface OwnerConfig {
  strategy: OwnerStrategy;
  target_users: OwnerUser[];
  // Bidirectional reverse direction
  reverse_strategy?: OwnerStrategy;
  reverse_users?: OwnerUser[];
}

export interface SyncFilter {
  field: string;
  operator: string; // "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "starts with" | "is empty" | "is not empty"
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
  owner_config: OwnerConfig | null;
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
