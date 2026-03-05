-- Add admin_notes column to customers table for internal notes
alter table public.customers
  add column if not exists admin_notes text;
