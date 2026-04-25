-- Full Feature Schema Alignment
-- Adds all missing tables from db.md to support campaigns, sequences, meetings, outcomes, etc.

-- 1. CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    stats JSONB DEFAULT '{}'::JSONB,
    variant_group TEXT,
    is_control BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- 2. SEQUENCE ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited')),
    current_step INT NOT NULL DEFAULT 0,
    emails_sent INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_replied INT DEFAULT 0,
    links_clicked INT DEFAULT 0,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    exited_at TIMESTAMPTZ,
    exit_reason TEXT,
    UNIQUE (lead_id, campaign_id)
);

-- 3. MEETINGS
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    calendar_event_id TEXT,
    calendar_provider TEXT,
    title TEXT NOT NULL,
    description TEXT,
    attendees JSONB NOT NULL DEFAULT '[]'::JSONB,
    organizer_email TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    meeting_link TEXT,
    booking_page_url TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    outcome TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    CHECK (end_time > start_time)
);

-- 4. OUTCOMES
CREATE TABLE IF NOT EXISTS public.outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('meeting_booked', 'meeting_completed', 'converted', 'lost', 'unsubscribed')),
    subtype TEXT,
    revenue_amount NUMERIC(12,2),
    revenue_currency TEXT DEFAULT 'USD',
    attributed_to JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TEMPLATES
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    category TEXT,
    subject_line TEXT,
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::JSONB,
    usage_count INT DEFAULT 0,
    avg_reply_rate NUMERIC(5,4),
    avg_booking_rate NUMERIC(5,4),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_ai_generated BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 6. INTEGRATIONS
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    category TEXT NOT NULL,
    credentials JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, provider)
);

-- 7. LEARNING DATA
CREATE TABLE IF NOT EXISTS public.learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    sample_size INT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    pattern_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    recommendations JSONB DEFAULT '[]'::JSONB,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    applied_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS POLICIES
-- We use the same pattern as workspaces: members of the tenant can CRUD for their tenant

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['campaigns', 'sequence_enrollments', 'meetings', 'outcomes', 'templates', 'integrations', 'learning_data'])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Tenant members CRUD" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Tenant members CRUD" ON public.%I FOR ALL TO authenticated USING (tenant_id = private.current_tenant_id() AND private.is_tenant_member(tenant_id)) WITH CHECK (tenant_id = private.current_tenant_id() AND private.is_tenant_member(tenant_id))', tbl);
    END LOOP;
END $$;

-- Fix updated_at triggers for new tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['campaigns', 'meetings', 'templates', 'integrations'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', tbl, tbl);
        EXECUTE format('CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()', tbl, tbl);
    END LOOP;
END $$;
