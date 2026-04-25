-- Enrich the leads table with practical fields
-- These fields give the AI agents real context to work with

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Indexes for ICP matching
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads(tenant_id, industry);
CREATE INDEX IF NOT EXISTS idx_leads_company_size ON public.leads(tenant_id, company_size);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(tenant_id, source);

-- Update campaigns table with proper ICP targeting fields
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS target_industries TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_company_sizes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_titles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_enroll BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence_threshold NUMERIC(3,2) DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS approval_required_below NUMERIC(3,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS sequence_steps JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS enrolled_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booked_count INT DEFAULT 0;
