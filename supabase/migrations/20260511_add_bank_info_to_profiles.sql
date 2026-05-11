-- ============================================
-- Add Bank Info to Profiles
-- ============================================

alter table profiles
  add column if not exists bank_name text default '',
  add column if not exists account_number text default '',
  add column if not exists account_holder text default '';
