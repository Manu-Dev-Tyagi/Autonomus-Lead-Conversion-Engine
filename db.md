-- ============================================================================
-- ALE (Autonomous Lead Engine) Database Schema
-- PostgreSQL 15+ with Row-Level Security (RLS)
-- ============================================================================
 
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring
 
-- ============================================================================
-- TENANTS
-- ============================================================================
 
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    
    -- Subscription
    plan VARCHAR(50) NOT NULL DEFAULT 'free', -- free, starter, pro, enterprise
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    
    -- Configuration (JSONB for flexibility)
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    CHECK (status IN ('active', 'suspended', 'cancelled'))
);
 
-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
 
-- Sample tenant config structure:
-- {
--   "icp": {
--     "industries": ["SaaS", "FinTech"],
--     "companySize": { "min": 10, "max": 500 },
--     "titles": ["CTO", "VP Engineering"],
--     "technologies": ["React", "Node.js"]
--   },
--   "scoring": {
--     "criteria": [...],
--     "qualificationThreshold": 70
--   },
--   "outreach": {
--     "tone": "professional",
--     "maxTouches": 5,
--     "touchDelays": ["0d", "2d", "5d", "7d"]
--   },
--   "safety": {
--     "confidenceThreshold": 0.7,
--     "requireApprovalFor": ["SEND_EMAIL"]
--   },
--   "integrations": {
--     "email": { "provider": "sendgrid", "apiKey": "..." },
--     "calendar": { "provider": "google", "credentials": {...} }
--   }
-- }
 
-- ============================================================================
-- LEADS
-- ============================================================================
 
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Company
    company_name VARCHAR(255),
    company_domain VARCHAR(255),
    
    -- Source tracking
    source VARCHAR(100) NOT NULL, -- form, webhook, api, manual
    source_details JSONB, -- { "form_id": "...", "utm_params": {...} }
    
    -- State machine
    state VARCHAR(50) NOT NULL DEFAULT 'new',
    -- States: new, enriching, enriched, scoring, qualified, 
    --         disqualified, outreach, replied, booked, converted, lost
    
    -- Score
    score NUMERIC(5,2), -- 0.00 to 100.00
    score_confidence NUMERIC(3,2), -- 0.00 to 1.00
    score_reasoning TEXT,
    score_breakdown JSONB, -- { "icp_fit": 85, "intent": 70, ... }
    
    -- Enrichment data
    enrichment_data JSONB DEFAULT '{}'::JSONB,
    enrichment_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
    enrichment_providers_used TEXT[], -- ['clearbit', 'apollo', 'llm_inference']
    
    -- Additional metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::JSONB,
    
    -- Assignment
    assigned_to UUID, -- User/Sales rep ID (if applicable)
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE (tenant_id, email),
    CHECK (score >= 0 AND score <= 100),
    CHECK (score_confidence >= 0 AND score_confidence <= 1),
    CHECK (state IN (
        'new', 'enriching', 'enriched', 'scoring', 'qualified', 
        'disqualified', 'outreach', 'replied', 'booked', 'converted', 'lost'
    ))
);
 
-- Indexes
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_state ON leads(tenant_id, state);
CREATE INDEX idx_leads_score ON leads(tenant_id, score DESC) WHERE score IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_company_domain ON leads(company_domain) WHERE company_domain IS NOT NULL;
CREATE INDEX idx_leads_enrichment_data ON leads USING GIN (enrichment_data);
 
-- Full-text search on names
CREATE INDEX idx_leads_fulltext ON leads USING GIN (
    to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(company_name, '')
    )
);
 
-- Row-Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON leads
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- Sample enrichment_data structure:
-- {
--   "person": {
--     "linkedin_url": "...",
--     "title": "VP Engineering",
--     "seniority": "executive",
--     "department": "engineering"
--   },
--   "company": {
--     "size": 150,
--     "industry": "SaaS",
--     "revenue": "$10M-$50M",
--     "funding": "Series B",
--     "technologies": ["React", "AWS", "PostgreSQL"],
--     "recent_signals": ["hiring", "product_launch"]
--   },
--   "intent": {
--     "signals": ["visited_pricing_page", "downloaded_whitepaper"],
--     "score": 75
--   }
-- }
 
-- ============================================================================
-- INTERACTIONS
-- ============================================================================
 
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Interaction type
    type VARCHAR(50) NOT NULL, -- email, call, meeting, sms, linkedin
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    
    -- Channel-specific data
    channel_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    -- For email: { "subject": "...", "from": "...", "to": "...", "thread_id": "..." }
    -- For meeting: { "duration": 30, "attendees": [...] }
    
    -- Content
    content TEXT, -- Email body, call transcript, etc.
    content_html TEXT, -- HTML version (for emails)
    
    -- Agent decision
    agent_name VARCHAR(100), -- Which agent made this decision
    agent_decision JSONB, -- Full AgentDecision object
    -- {
    --   "action": "SEND_EMAIL",
    --   "confidence": 0.85,
    --   "reasoning": "...",
    --   "alternatives": [...]
    -- }
    
    -- Outcome
    outcome VARCHAR(50), -- sent, delivered, opened, clicked, replied, bounced, booked
    outcome_data JSONB, -- { "opened_at": "...", "clicked_links": [...] }
    
    -- Tracking
    sequence_id UUID, -- If part of a sequence
    sequence_step INT, -- Step number in sequence
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE, -- For future sends
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (type IN ('email', 'call', 'meeting', 'sms', 'linkedin')),
    CHECK (direction IN ('inbound', 'outbound'))
);
 
-- Indexes
CREATE INDEX idx_interactions_lead_id ON interactions(lead_id, created_at DESC);
CREATE INDEX idx_interactions_tenant_id ON interactions(tenant_id, created_at DESC);
CREATE INDEX idx_interactions_type ON interactions(type, created_at DESC);
CREATE INDEX idx_interactions_outcome ON interactions(outcome);
CREATE INDEX idx_interactions_scheduled ON interactions(scheduled_at) 
    WHERE scheduled_at IS NOT NULL AND completed_at IS NULL;
 
-- RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON interactions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- CAMPAIGNS & SEQUENCES
-- ============================================================================
 
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, paused, archived
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    -- {
    --   "trigger": { "type": "lead_qualified", "conditions": {...} },
    --   "sequences": [...],
    --   "exit_conditions": [...]
    -- }
    
    -- Performance tracking
    stats JSONB DEFAULT '{}'::JSONB,
    -- {
    --   "enrolled": 150,
    --   "replied": 25,
    --   "booked": 10,
    --   "conversion_rate": 0.067
    -- }
    
    -- A/B testing
    variant_group VARCHAR(100), -- For grouping related variants
    is_control BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (status IN ('draft', 'active', 'paused', 'archived'))
);
 
CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
 
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON campaigns
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- SEQUENCE ENROLLMENTS (Lead x Campaign tracking)
-- ============================================================================
 
CREATE TABLE sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    
    -- State
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, completed, exited
    current_step INT NOT NULL DEFAULT 0,
    
    -- Performance
    emails_sent INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_replied INT DEFAULT 0,
    links_clicked INT DEFAULT 0,
    
    -- Timestamps
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    exited_at TIMESTAMP WITH TIME ZONE,
    exit_reason VARCHAR(100), -- replied, booked, unsubscribed, bounced, etc.
    
    -- Constraints
    UNIQUE (lead_id, campaign_id),
    CHECK (status IN ('active', 'paused', 'completed', 'exited'))
);
 
CREATE INDEX idx_sequence_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX idx_sequence_enrollments_campaign ON sequence_enrollments(campaign_id);
CREATE INDEX idx_sequence_enrollments_status ON sequence_enrollments(status);
 
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON sequence_enrollments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- MEETINGS
-- ============================================================================
 
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Calendar integration
    calendar_event_id VARCHAR(255), -- Google/Outlook event ID
    calendar_provider VARCHAR(50), -- google, outlook, etc.
    
    -- Meeting details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Participants
    attendees JSONB NOT NULL, -- [{ "email": "...", "name": "...", "role": "..." }]
    organizer_email VARCHAR(255) NOT NULL,
    
    -- Scheduling
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    
    -- Links
    meeting_link VARCHAR(500), -- Zoom, Google Meet, etc.
    booking_page_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', 
    -- scheduled, confirmed, completed, cancelled, no_show
    
    -- Outcome
    outcome VARCHAR(100), -- qualified, not_qualified, demo_scheduled, etc.
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    CHECK (end_time > start_time)
);
 
CREATE INDEX idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX idx_meetings_tenant_id ON meetings(tenant_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_status ON meetings(status);
 
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON meetings
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- AGENT DECISIONS (Audit Log)
-- ============================================================================
 
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Agent info
    agent_name VARCHAR(100) NOT NULL, -- intake, enrichment, scoring, etc.
    agent_version VARCHAR(50),
    
    -- Context
    context JSONB NOT NULL, -- Full AgentContext at decision time
    
    -- Decision
    decision JSONB NOT NULL, -- Full AgentDecision object
    -- {
    --   "action": "...",
    --   "confidence": 0.85,
    --   "reasoning": "...",
    --   "alternatives": [...],
    --   "metadata": {...}
    -- }
    
    -- Execution
    executed BOOLEAN NOT NULL DEFAULT false,
    execution_result JSONB,
    
    -- Override tracking
    overridden BOOLEAN DEFAULT false,
    override_reason TEXT,
    overridden_by UUID, -- User ID
    overridden_at TIMESTAMP WITH TIME ZONE,
    
    -- LLM tracking
    llm_provider VARCHAR(50), -- gemini, openai, etc.
    llm_model VARCHAR(100),
    llm_tokens_used INT,
    llm_latency_ms INT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_agent_decisions_lead_id ON agent_decisions(lead_id, created_at DESC);
CREATE INDEX idx_agent_decisions_tenant_id ON agent_decisions(tenant_id, created_at DESC);
CREATE INDEX idx_agent_decisions_agent_name ON agent_decisions(agent_name);
CREATE INDEX idx_agent_decisions_executed ON agent_decisions(executed);
 
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON agent_decisions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- OUTCOMES (For Learning Agent)
-- ============================================================================
 
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    
    -- Outcome classification
    type VARCHAR(50) NOT NULL, -- meeting_booked, meeting_completed, converted, lost
    subtype VARCHAR(100), -- qualified, not_qualified, no_show, etc.
    
    -- Revenue tracking
    revenue_amount NUMERIC(12,2),
    revenue_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Attribution
    attributed_to JSONB, -- Which agents/sequences contributed
    -- {
    --   "primary_sequence": "...",
    --   "touchpoints": [...],
    --   "key_agents": ["scoring", "composer"]
    -- }
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CHECK (type IN ('meeting_booked', 'meeting_completed', 'converted', 'lost', 'unsubscribed'))
);
 
CREATE INDEX idx_outcomes_lead_id ON outcomes(lead_id);
CREATE INDEX idx_outcomes_tenant_id ON outcomes(tenant_id, occurred_at DESC);
CREATE INDEX idx_outcomes_type ON outcomes(type);
CREATE INDEX idx_outcomes_campaign_id ON outcomes(campaign_id) WHERE campaign_id IS NOT NULL;
 
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON outcomes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- LEARNING DATA (Patterns, Insights)
-- ============================================================================
 
CREATE TABLE learning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Pattern identification
    pattern_type VARCHAR(100) NOT NULL, -- segment_performance, sequence_effectiveness, timing_optimization
    pattern_name VARCHAR(255) NOT NULL,
    
    -- Statistical data
    sample_size INT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL, -- 0.00 to 1.00
    
    -- Pattern details
    pattern_data JSONB NOT NULL,
    -- Example for segment_performance:
    -- {
    --   "segment": { "industry": "SaaS", "size": "10-50" },
    --   "metrics": {
    --     "conversion_rate": 0.18,
    --     "avg_touches_to_reply": 2.3,
    --     "best_send_time": "10am-11am"
    --   },
    --   "vs_average": {
    --     "conversion_rate_lift": 1.5,
    --     "statistical_significance": 0.95
    --   }
    -- }
    
    -- Recommendations
    recommendations JSONB,
    -- [
    --   {
    --     "agent": "strategy",
    --     "action": "increase_touches",
    --     "params": { "from": 3, "to": 5 },
    --     "expected_impact": 0.12
    --   }
    -- ]
    
    -- Application tracking
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by VARCHAR(50), -- 'auto' or user ID
    
    -- Validation
    ab_test_id UUID, -- If A/B test created to validate
    validated BOOLEAN DEFAULT false,
    validation_result JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Patterns can expire
    
    CHECK (confidence >= 0 AND confidence <= 1)
);
 
CREATE INDEX idx_learning_data_tenant_id ON learning_data(tenant_id, created_at DESC);
CREATE INDEX idx_learning_data_pattern_type ON learning_data(pattern_type);
CREATE INDEX idx_learning_data_applied ON learning_data(applied);
 
ALTER TABLE learning_data ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON learning_data
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- TEMPLATES (Email templates)
-- ============================================================================
 
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- email, sms, linkedin
    category VARCHAR(100), -- cold_outreach, follow_up, objection_handler, etc.
    
    -- Content
    subject_line VARCHAR(500), -- For emails
    body_template TEXT NOT NULL,
    
    -- Variables
    variables JSONB DEFAULT '[]'::JSONB, -- ["first_name", "company_name", "recent_event"]
    
    -- Performance
    usage_count INT DEFAULT 0,
    avg_reply_rate NUMERIC(5,4), -- 0.0000 to 1.0000
    avg_booking_rate NUMERIC(5,4),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, archived
    is_ai_generated BOOLEAN DEFAULT false,
    
    -- Metadata
    tags TEXT[],
    created_by UUID, -- User ID or 'system'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    CHECK (status IN ('draft', 'active', 'archived'))
);
 
CREATE INDEX idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_performance ON templates(avg_reply_rate DESC) 
    WHERE avg_reply_rate IS NOT NULL;
 
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON templates
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- INTEGRATIONS (External service credentials)
-- ============================================================================
 
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Integration type
    provider VARCHAR(100) NOT NULL, -- sendgrid, google_calendar, clearbit, etc.
    category VARCHAR(50) NOT NULL, -- email, calendar, enrichment, etc.
    
    -- Credentials (encrypted)
    credentials JSONB NOT NULL,
    -- { "api_key": "...", "refresh_token": "...", ... }
    -- Note: Encrypt this at application level before storing
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, error, disabled
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE (tenant_id, provider),
    CHECK (status IN ('active', 'error', 'disabled'))
);
 
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
 
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON integrations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- EVENTS (Event Sourcing / Audit Trail)
-- ============================================================================
 
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event identity
    event_type VARCHAR(100) NOT NULL, -- LeadCreated, EmailSent, MeetingBooked, etc.
    aggregate_name VARCHAR(100) NOT NULL, -- Lead, Interaction, Campaign, etc.
    aggregate_id UUID NOT NULL,
    
    -- Event data
    event_data JSONB NOT NULL,
    
    -- Metadata
    user_id UUID, -- If triggered by user action
    ip_address INET,
    user_agent TEXT,
    
    -- Causality (for event replay)
    caused_by UUID REFERENCES events(id), -- Parent event that triggered this
    correlation_id UUID, -- For grouping related events
    
    -- Timestamp (immutable)
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Versioning (for schema evolution)
    version INT NOT NULL DEFAULT 1
);
 
-- Partition by month for scalability
CREATE INDEX idx_events_occurred_at ON events(occurred_at DESC);
CREATE INDEX idx_events_aggregate ON events(aggregate_name, aggregate_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_tenant_id ON events(tenant_id, occurred_at DESC);
 
-- This table is append-only, no updates/deletes allowed
CREATE RULE events_immutable AS ON UPDATE TO events DO INSTEAD NOTHING;
CREATE RULE events_no_delete AS ON DELETE TO events DO INSTEAD NOTHING;
 
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON events
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- USERS (For multi-user tenants)
-- ============================================================================
 
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Role & permissions
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    permissions JSONB DEFAULT '[]'::JSONB,
    
    -- Calendar sync (for meeting assignment)
    calendar_connected BOOLEAN DEFAULT false,
    calendar_provider VARCHAR(50),
    calendar_email VARCHAR(255),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, suspended
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE (email),
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    CHECK (status IN ('active', 'inactive', 'suspended'))
);
 
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
 
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
 
-- ============================================================================
-- VIEWS
-- ============================================================================
 
-- Materialized view for lead funnel metrics (refresh periodically)
CREATE MATERIALIZED VIEW lead_funnel_metrics AS
SELECT 
    tenant_id,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE state = 'qualified') AS qualified_leads,
    COUNT(*) FILTER (WHERE state = 'booked') AS booked_leads,
    COUNT(*) FILTER (WHERE state = 'converted') AS converted_leads,
    AVG(score) FILTER (WHERE score IS NOT NULL) AS avg_score,
    AVG(EXTRACT(EPOCH FROM (last_activity_at - created_at))/3600) 
        FILTER (WHERE last_activity_at IS NOT NULL) AS avg_hours_to_activity
FROM leads
GROUP BY tenant_id, DATE_TRUNC('day', created_at);
 
CREATE UNIQUE INDEX idx_lead_funnel_metrics ON lead_funnel_metrics(tenant_id, day);
 
-- View for active sequences
CREATE VIEW active_sequences AS
SELECT 
    se.id,
    se.tenant_id,
    se.lead_id,
    se.campaign_id,
    se.status,
    se.current_step,
    c.name AS campaign_name,
    l.email AS lead_email,
    l.state AS lead_state,
    se.enrolled_at,
    se.last_activity_at
FROM sequence_enrollments se
JOIN campaigns c ON se.campaign_id = c.id
JOIN leads l ON se.lead_id = l.id
WHERE se.status = 'active';
 
-- ============================================================================
-- FUNCTIONS
-- ============================================================================
 
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
-- Apply to relevant tables
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
-- Function to auto-update lead.last_activity_at on new interaction
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET last_activity_at = NEW.created_at
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER update_lead_activity AFTER INSERT ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_lead_last_activity();
 
-- ============================================================================
-- SEED DATA (Development)
-- ============================================================================
 
-- Insert default tenant for development
INSERT INTO tenants (id, name, slug, plan, config) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo Company',
    'demo',
    'pro',
    '{
        "icp": {
            "industries": ["SaaS", "Technology"],
            "companySize": {"min": 10, "max": 500},
            "titles": ["CTO", "VP Engineering", "Engineering Manager"]
        },
        "scoring": {
            "qualificationThreshold": 70
        },
        "outreach": {
            "tone": "professional",
            "maxTouches": 5
        },
        "safety": {
            "confidenceThreshold": 0.7
        }
    }'::JSONB
);
 
-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
 
-- 1. Partitioning: Consider partitioning events table by month for large volumes
-- 2. Archival: Move old leads/interactions to cold storage after N months
-- 3. Caching: Cache frequently accessed tenant configs in Redis
-- 4. Connection pooling: Use PgBouncer for connection management
-- 5. Indexes: Monitor slow queries and add indexes as needed
 
-- ============================================================================
-- MAINTENANCE
-- ============================================================================
 
-- Refresh materialized view (run via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY lead_funnel_metrics;
 
-- Vacuum and analyze (run weekly)
-- VACUUM ANALYZE;
 
-- ============================================================================