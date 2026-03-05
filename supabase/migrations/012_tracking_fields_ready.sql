-- Tracks which org+object combinations already have OrgSync_Source_Id__c created.
-- Format: { "orgId:ObjectApiName": true }
-- This avoids repeatedly hitting Salesforce's metadata API (which has a cache delay
-- after field creation) to check if the field exists.
alter table public.sync_configs
  add column if not exists tracking_fields_ready jsonb not null default '{}'::jsonb;
