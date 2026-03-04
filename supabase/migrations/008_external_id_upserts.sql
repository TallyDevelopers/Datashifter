-- ============================================================
-- Migration 008: Switch to Salesforce External ID upserts
--
-- OrgSync now uses OrgSync_Source_Id__c (a custom External ID
-- field on target objects in Salesforce) for upserts instead of
-- maintaining a sync_record_mappings table in Supabase.
--
-- Benefits:
--   - Zero Supabase storage growth for record mappings
--   - Salesforce handles find-or-create natively
--   - Handles "target record manually deleted" gracefully
--   - Industry-standard integration pattern
--
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop the sync_record_mappings table — no longer needed.
-- All existing data can be discarded safely; the external ID
-- field on Salesforce records is the new source of truth.
drop table if exists public.sync_record_mappings cascade;
