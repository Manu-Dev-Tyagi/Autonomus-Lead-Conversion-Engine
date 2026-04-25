-- ALE Schema Alignment Migration
-- Adds missing columns to tenants table that the application code expects
-- Run in Supabase SQL Editor

-- 1. Add industry and company_size to tenants (for onboarding)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS company_size text;

-- 2. Add plan and status columns to tenants (for Tenant domain model)
-- Using text instead of enum for flexibility
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_tenant_state
  ON public.leads(tenant_id, state);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_email
  ON public.leads(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_score
  ON public.leads(tenant_id, score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_tenant_lead
  ON public.agent_decisions(tenant_id, lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_tenant_lead
  ON public.interactions(tenant_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug
  ON public.workspaces(slug);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id
  ON public.workspaces(tenant_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant
  ON public.audit_logs(tenant_id, created_at DESC);

-- 4. Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenants_updated_at'
  ) THEN
    CREATE TRIGGER set_tenants_updated_at
      BEFORE UPDATE ON public.tenants
      FOR EACH ROW
      EXECUTE FUNCTION private.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_leads_updated_at'
  ) THEN
    CREATE TRIGGER set_leads_updated_at
      BEFORE UPDATE ON public.leads
      FOR EACH ROW
      EXECUTE FUNCTION private.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_workspaces_updated_at'
  ) THEN
    CREATE TRIGGER set_workspaces_updated_at
      BEFORE UPDATE ON public.workspaces
      FOR EACH ROW
      EXECUTE FUNCTION private.set_updated_at();
  END IF;
END $$;
