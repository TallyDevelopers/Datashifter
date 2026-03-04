-- ============================================================
-- Migration 007: AI Summary for Sync Configs
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.sync_configs
  add column if not exists ai_summary text;
