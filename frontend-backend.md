# ALE Frontend-Backend Integration Guide
## Complete User Journey with Atlassian Design System

**Version:** 1.0  
**Date:** April 24, 2026  
**Design System:** Atlassian Design System (Atlaskit)  
**Framework:** Next.js 14+ with TypeScript

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [User Personas & Journeys](#user-personas--journeys)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend API Architecture](#backend-api-architecture)
5. [Atlassian Design System Integration](#atlassian-design-system-integration)
6. [User Journey Implementation](#user-journey-implementation)
7. [API Contracts](#api-contracts)
8. [State Management](#state-management)
9. [Real-Time Updates](#real-time-updates)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. SYSTEM OVERVIEW

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Marketing    │  │   Sales Ops    │  │   Admin/CTO    │   │
│  │   Manager      │  │   Manager      │  │   Dashboard    │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS/WSS
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                     NEXT.JS APP LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Page Routes │  │  API Routes  │  │  Server      │         │
│  │  (RSC)       │  │  (Actions)   │  │  Components  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Internal API Calls
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    BACKEND API LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  REST API  │  │  GraphQL   │  │  Webhooks  │               │
│  │  Routes    │  │  (Future)  │  │  Handlers  │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Use Cases
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│              APPLICATION LAYER (Use Cases)                       │
├─────────────────────────────────────────────────────────────────┤
│  CreateLeadUseCase │ OrchestrateLifecycleUseCase │             │
│  ExecuteOutreachUseCase │ HandleReplyUseCase │ etc.            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    DOMAIN LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  Lead │ Interaction │ Campaign │ Agents │ Events               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL │ RabbitMQ │ Gemini │ SendGrid │ Calendar          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. USER PERSONAS & JOURNEYS

### 2.1 Persona 1: Marketing Manager (Primary User)

**Goals:**
- Set up lead capture from multiple sources
- Monitor lead qualification rates
- Optimize conversion funnel
- Review AI-generated outreach quality

**User Journey:**

```
1. Onboarding (Day 1)
   ├─ Sign up with email/Google
   ├─ Create organization
   ├─ Invite team members
   ├─ Connect lead sources (form, webhook, API)
   └─ Define ICP (Ideal Customer Profile)

2. Daily Operations
   ├─ Dashboard overview (leads, conversions, reply rates)
   ├─ Review recent leads
   ├─ Monitor AI decisions
   ├─ Approve/reject low-confidence actions
   └─ Check calendar bookings

3. Optimization (Weekly)
   ├─ Review performance analytics
   ├─ Adjust ICP criteria
   ├─ Update email templates
   ├─ Review learning insights
   └─ Run A/B tests
```

---

### 2.2 Persona 2: Sales Ops Manager (Power User)

**Goals:**
- Fine-tune agent behavior
- Manage sequences and campaigns
- Handle escalations and edge cases
- Ensure quality control

**User Journey:**

```
1. Campaign Management
   ├─ Create new outreach sequence
   ├─ Configure agent parameters
   ├─ Set confidence thresholds
   ├─ Define approval workflows
   └─ Launch campaign

2. Quality Control
   ├─ Review flagged decisions
   ├─ Provide feedback to learning agent
   ├─ Triage DLQ (Dead Letter Queue)
   ├─ Manually override agent decisions
   └─ Export audit logs

3. Performance Monitoring
   ├─ Agent performance dashboard
   ├─ Sequence comparison
   ├─ Lead scoring accuracy
   └─ ROI analytics
```

---

### 2.3 Persona 3: Admin/CTO (Administrator)

**Goals:**
- System health monitoring
- Security and compliance
- Multi-tenant management
- Cost control

**User Journey:**

```
1. System Administration
   ├─ Manage tenants
   ├─ Configure integrations
   ├─ Set rate limits
   ├─ Review audit logs
   └─ Manage API keys

2. Operations Dashboard
   ├─ System health metrics
   ├─ Error rates and DLQ
   ├─ Agent performance
   ├─ Cost tracking
   └─ SLA compliance

3. Security & Compliance
   ├─ User access management
   ├─ Data export requests (GDPR)
   ├─ Security audit logs
   └─ Incident management
```

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Technology Stack

```json
{
  "framework": "Next.js 14+",
  "language": "TypeScript",
  "ui-library": "@atlaskit/* (Atlassian Design System)",
  "styling": "Emotion (built into Atlaskit)",
  "state-management": "Zustand + React Query",
  "forms": "React Hook Form + Zod validation",
  "charts": "Recharts (compatible with Atlaskit)",
  "real-time": "Supabase Realtime / Server-Sent Events",
  "testing": "Vitest + React Testing Library"
}
```

---

### 3.2 Directory Structure

```
app/
├── (auth)/                          # Auth layout group
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── layout.tsx                   # Auth-specific layout
│
├── (dashboard)/                     # Main app layout group
│   ├── layout.tsx                   # Dashboard layout with sidebar
│   │
│   ├── overview/                    # Marketing Manager: Overview
│   │   └── page.tsx
│   │
│   ├── leads/                       # Lead management
│   │   ├── page.tsx                 # Lead list
│   │   ├── [id]/
│   │   │   ├── page.tsx             # Lead detail
│   │   │   └── timeline/
│   │   │       └── page.tsx         # Lead timeline view
│   │   └── import/
│   │       └── page.tsx             # Bulk import
│   │
│   ├── campaigns/                   # Sales Ops: Campaign management
│   │   ├── page.tsx                 # Campaign list
│   │   ├── [id]/
│   │   │   ├── page.tsx             # Campaign detail
│   │   │   └── edit/
│   │   │       └── page.tsx         # Campaign editor
│   │   └── new/
│   │       └── page.tsx             # Create campaign
│   │
│   ├── sequences/                   # Sequence templates
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── approvals/                   # Low-confidence decision queue
│   │   ├── page.tsx                 # Approval queue
│   │   └── [id]/
│   │       └── page.tsx             # Approval detail
│   │
│   ├── analytics/                   # Performance analytics
│   │   ├── overview/
│   │   │   └── page.tsx             # High-level metrics
│   │   ├── agents/
│   │   │   └── page.tsx             # Agent performance
│   │   ├── sequences/
│   │   │   └── page.tsx             # Sequence comparison
│   │   └── learning/
│   │       └── page.tsx             # Learning insights
│   │
│   ├── settings/                    # Configuration
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── organization/
│   │   │   └── page.tsx
│   │   ├── icp/
│   │   │   └── page.tsx             # ICP definition
│   │   ├── integrations/
│   │   │   └── page.tsx             # Email, calendar, enrichment
│   │   └── team/
│   │       └── page.tsx             # Team management
│   │
│   └── admin/                       # Admin/CTO dashboards
│       ├── tenants/
│       │   └── page.tsx             # Multi-tenant management
│       ├── operations/
│       │   └── page.tsx             # System health
│       ├── dlq/
│       │   └── page.tsx             # Dead letter queue
│       └── audit/
│           └── page.tsx             # Audit logs
│
├── api/                             # API routes (Next.js App Router)
│   ├── leads/
│   │   ├── route.ts                 # GET, POST /api/leads
│   │   └── [id]/
│   │       └── route.ts             # GET, PATCH, DELETE /api/leads/:id
│   │
│   ├── campaigns/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   │
│   ├── approvals/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── approve/
│   │       │   └── route.ts         # POST /api/approvals/:id/approve
│   │       └── reject/
│   │           └── route.ts         # POST /api/approvals/:id/reject
│   │
│   ├── webhooks/
│   │   ├── email/
│   │   │   └── route.ts             # POST /api/webhooks/email (SendGrid)
│   │   ├── forms/
│   │   │   └── route.ts             # POST /api/webhooks/forms
│   │   └── calendar/
│   │       └── route.ts             # POST /api/webhooks/calendar
│   │
│   └── analytics/
│       ├── funnel/
│       │   └── route.ts
│       └── performance/
│           └── route.ts
│
├── actions/                         # Server actions (forms, mutations)
│   ├── leads.ts
│   ├── campaigns.ts
│   ├── approvals.ts
│   └── settings.ts
│
└── components/                      # Shared components
    ├── layouts/
    │   ├── DashboardLayout.tsx
    │   ├── Sidebar.tsx
    │   └── Header.tsx
    │
    ├── leads/
    │   ├── LeadCard.tsx
    │   ├── LeadList.tsx
    │   ├── LeadTimeline.tsx
    │   ├── LeadScoreIndicator.tsx
    │   └── LeadStateBadge.tsx
    │
    ├── campaigns/
    │   ├── CampaignCard.tsx
    │   ├── SequenceBuilder.tsx
    │   └── CampaignMetrics.tsx
    │
    ├── agents/
    │   ├── AgentDecisionCard.tsx
    │   ├── AgentReasoningPanel.tsx
    │   └── ConfidenceIndicator.tsx
    │
    ├── analytics/
    │   ├── FunnelChart.tsx
    │   ├── PerformanceMetrics.tsx
    │   └── LearningInsightsPanel.tsx
    │
    └── shared/
        ├── EmptyState.tsx
        ├── LoadingState.tsx
        ├── ErrorBoundary.tsx
        └── Toast.tsx

lib/
├── api/                             # API client
│   ├── client.ts                    # Base fetch wrapper
│   ├── leads.ts                     # Lead API methods
│   ├── campaigns.ts
│   └── analytics.ts
│
├── hooks/                           # Custom React hooks
│   ├── useLeads.ts                  # React Query hooks
│   ├── useCampaigns.ts
│   ├── useRealtime.ts               # Supabase realtime subscriptions
│   └── useToast.ts
│
├── stores/                          # Zustand stores
│   ├── authStore.ts
│   ├── tenantStore.ts
│   └── uiStore.ts
│
├── utils/
│   ├── formatters.ts                # Date, currency, number formatters
│   ├── validators.ts                # Zod schemas
│   └── constants.ts
│
└── types/
    ├── lead.ts
    ├── campaign.ts
    ├── agent.ts
    └── api.ts
```

---

## 4. ATLASSIAN DESIGN SYSTEM INTEGRATION

### 4.1 Installation

```bash
npm install @atlaskit/page
npm install @atlaskit/button
npm install @atlaskit/form
npm install @atlaskit/textfield
npm install @atlaskit/select
npm install @atlaskit/modal-dialog
npm install @atlaskit/table
npm install @atlaskit/dynamic-table
npm install @atlaskit/badge
npm install @atlaskit/lozenge
npm install @atlaskit/avatar
npm install @atlaskit/icon
npm install @atlaskit/spinner
npm install @atlaskit/inline-edit
npm install @atlaskit/flag
npm install @atlaskit/page-layout
npm install @atlaskit/side-navigation
npm install @atlaskit/breadcrumbs
npm install @atlaskit/tabs
npm install @atlaskit/section-message
npm install @atlaskit/empty-state
npm install @atlaskit/progress-indicator
npm install @atlaskit/tooltip
npm install @atlaskit/dropdown-menu
npm install @atlaskit/popup
npm install @atlaskit/banner
npm install @atlaskit/code
npm install @atlaskit/datetime-picker
```

---

### 4.2 Theme Configuration

**File:** `app/providers.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { setGlobalTheme } from '@atlaskit/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set Atlassian theme (light/dark/auto)
    const theme = localStorage.getItem('theme') || 'light';
    setGlobalTheme({ colorMode: theme as 'light' | 'dark' | 'auto' });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**File:** `app/layout.tsx`

```typescript
import { Providers } from './providers';
import '@atlaskit/css-reset';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### 4.3 Component Examples with Atlaskit

#### Dashboard Layout

**File:** `components/layouts/DashboardLayout.tsx`

```typescript
'use client';

import {
  Content,
  LeftSidebar,
  Main,
  PageLayout,
  TopNavigation,
} from '@atlaskit/page-layout';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <PageLayout>
      <TopNavigation height={60} isFixed>
        <Header />
      </TopNavigation>
      
      <Content>
        <LeftSidebar width={240} isFixed>
          <Sidebar />
        </LeftSidebar>
        
        <Main>
          <div style={{ padding: '24px' }}>
            {children}
          </div>
        </Main>
      </Content>
    </PageLayout>
  );
}
```

---

#### Sidebar Navigation

**File:** `components/layouts/Sidebar.tsx`

```typescript
'use client';

import {
  ButtonItem,
  Header,
  NavigationContent,
  NavigationHeader,
  NestableNavigationContent,
  NestingItem,
  Section,
  SideNavigation,
} from '@atlaskit/side-navigation';
import DashboardIcon from '@atlaskit/icon/glyph/dashboard';
import PeopleIcon from '@atlaskit/icon/glyph/people';
import GraphLineIcon from '@atlaskit/icon/glyph/graph-line';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import { usePathname, useRouter } from 'next/navigation';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SideNavigation label="ALE Navigation">
      <NavigationHeader>
        <Header description="Autonomous Lead Engine">
          ALE Platform
        </Header>
      </NavigationHeader>
      
      <NavigationContent>
        <Section>
          <ButtonItem
            iconBefore={<DashboardIcon label="" />}
            isSelected={pathname === '/overview'}
            onClick={() => router.push('/overview')}
          >
            Overview
          </ButtonItem>
          
          <NestingItem
            iconBefore={<PeopleIcon label="" />}
            id="leads"
            title="Leads"
          >
            <Section>
              <ButtonItem
                isSelected={pathname === '/leads'}
                onClick={() => router.push('/leads')}
              >
                All Leads
              </ButtonItem>
              <ButtonItem
                isSelected={pathname === '/leads/qualified'}
                onClick={() => router.push('/leads/qualified')}
              >
                Qualified
              </ButtonItem>
              <ButtonItem
                isSelected={pathname === '/leads/import'}
                onClick={() => router.push('/leads/import')}
              >
                Import
              </ButtonItem>
            </Section>
          </NestingItem>
          
          <ButtonItem
            iconBefore={<GraphLineIcon label="" />}
            isSelected={pathname.startsWith('/campaigns')}
            onClick={() => router.push('/campaigns')}
          >
            Campaigns
          </ButtonItem>
          
          <ButtonItem
            iconBefore={<GraphLineIcon label="" />}
            isSelected={pathname.startsWith('/analytics')}
            onClick={() => router.push('/analytics')}
          >
            Analytics
          </ButtonItem>
          
          <ButtonItem
            iconBefore={<SettingsIcon label="" />}
            isSelected={pathname.startsWith('/settings')}
            onClick={() => router.push('/settings')}
          >
            Settings
          </ButtonItem>
        </Section>
      </NavigationContent>
    </SideNavigation>
  );
}
```

---

#### Lead List with Dynamic Table

**File:** `app/(dashboard)/leads/page.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button';
import { useRouter } from 'next/navigation';
import { useLeads } from '@/lib/hooks/useLeads';
import { LeadScoreIndicator } from '@/components/leads/LeadScoreIndicator';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';

export default function LeadsPage() {
  const router = useRouter();
  const { data: leads, isLoading, error } = useLeads();

  const head = {
    cells: [
      { key: 'name', content: 'Name', isSortable: true, width: 25 },
      { key: 'company', content: 'Company', isSortable: true, width: 20 },
      { key: 'score', content: 'Score', isSortable: true, width: 10 },
      { key: 'state', content: 'State', isSortable: true, width: 15 },
      { key: 'source', content: 'Source', width: 15 },
      { key: 'created', content: 'Created', isSortable: true, width: 15 },
    ],
  };

  const rows = useMemo(() => {
    if (!leads) return [];
    
    return leads.map((lead) => ({
      key: lead.id,
      cells: [
        {
          key: 'name',
          content: (
            <div>
              <div style={{ fontWeight: 500 }}>{lead.firstName} {lead.lastName}</div>
              <div style={{ fontSize: '12px', color: '#6B778C' }}>{lead.email}</div>
            </div>
          ),
        },
        {
          key: 'company',
          content: lead.companyName || '-',
        },
        {
          key: 'score',
          content: lead.score ? (
            <LeadScoreIndicator score={lead.score} confidence={lead.scoreConfidence} />
          ) : '-',
        },
        {
          key: 'state',
          content: <LeadStateBadge state={lead.state} />,
        },
        {
          key: 'source',
          content: <Lozenge appearance="default">{lead.source}</Lozenge>,
        },
        {
          key: 'created',
          content: new Date(lead.createdAt).toLocaleDateString(),
        },
      ],
      onClick: () => router.push(`/leads/${lead.id}`),
    }));
  }, [leads, router]);

  if (isLoading) return <LoadingState />;
  if (error) return <div>Error loading leads</div>;
  if (!leads || leads.length === 0) {
    return (
      <EmptyState
        header="No leads yet"
        description="Start by importing leads or connecting a lead source"
        primaryAction={
          <Button appearance="primary" onClick={() => router.push('/leads/import')}>
            Import Leads
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>Leads</h1>
        <Button appearance="primary" onClick={() => router.push('/leads/import')}>
          Import Leads
        </Button>
      </div>
      
      <DynamicTable
        head={head}
        rows={rows}
        rowsPerPage={20}
        defaultPage={1}
        isFixedSize
        defaultSortKey="created"
        defaultSortOrder="DESC"
      />
    </div>
  );
}

function LeadStateBadge({ state }: { state: string }) {
  const appearanceMap: Record<string, 'success' | 'inprogress' | 'removed' | 'default'> = {
    converted: 'success',
    qualified: 'success',
    outreach: 'inprogress',
    replied: 'inprogress',
    booked: 'inprogress',
    new: 'default',
    enriching: 'default',
    disqualified: 'removed',
    lost: 'removed',
  };

  return (
    <Lozenge appearance={appearanceMap[state] || 'default'}>
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </Lozenge>
  );
}
```

---

#### Lead Detail Page with Tabs

**File:** `app/(dashboard)/leads/[id]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import { useLead } from '@/lib/hooks/useLeads';
import { LeadTimeline } from '@/components/leads/LeadTimeline';
import { LeadScoreIndicator } from '@/components/leads/LeadScoreIndicator';
import { AgentDecisionCard } from '@/components/agents/AgentDecisionCard';
import { LoadingState } from '@/components/shared/LoadingState';

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const { data: lead, isLoading } = useLead(leadId);
  const [selectedTab, setSelectedTab] = useState(0);

  if (isLoading) return <LoadingState />;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px' 
      }}>
        <div>
          <h1>{lead.firstName} {lead.lastName}</h1>
          <p style={{ color: '#6B778C' }}>{lead.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button>Edit</Button>
          <Button appearance="primary">Send Email</Button>
        </div>
      </div>

      {/* Lead Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
        marginBottom: '24px' 
      }}>
        <SummaryCard
          label="Company"
          value={lead.companyName || '-'}
        />
        <SummaryCard
          label="Score"
          value={<LeadScoreIndicator score={lead.score} confidence={lead.scoreConfidence} />}
        />
        <SummaryCard
          label="State"
          value={<Lozenge appearance="success">{lead.state}</Lozenge>}
        />
        <SummaryCard
          label="Source"
          value={<Lozenge appearance="default">{lead.source}</Lozenge>}
        />
      </div>

      {/* Agent Decision Alert (if low confidence) */}
      {lead.latestDecision && lead.latestDecision.confidence < 0.7 && (
        <SectionMessage
          appearance="warning"
          title="Low Confidence Decision"
        >
          <p>
            The {lead.latestDecision.agentName} agent has made a decision with{' '}
            {(lead.latestDecision.confidence * 100).toFixed(0)}% confidence.
            Please review and approve or reject.
          </p>
          <div style={{ marginTop: '8px' }}>
            <Button appearance="primary">Review Decision</Button>
          </div>
        </SectionMessage>
      )}

      {/* Tabs */}
      <Tabs
        selected={selectedTab}
        onChange={(index) => setSelectedTab(index)}
      >
        <TabList>
          <Tab>Timeline</Tab>
          <Tab>Enrichment Data</Tab>
          <Tab>Agent Decisions</Tab>
          <Tab>Interactions</Tab>
        </TabList>
        
        <TabPanel>
          <LeadTimeline leadId={leadId} />
        </TabPanel>
        
        <TabPanel>
          <EnrichmentDataView data={lead.enrichmentData} />
        </TabPanel>
        
        <TabPanel>
          <AgentDecisionsView leadId={leadId} />
        </TabPanel>
        
        <TabPanel>
          <InteractionsView leadId={leadId} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #DFE1E6',
      borderRadius: '3px' 
    }}>
      <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

function EnrichmentDataView({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) {
    return <div>No enrichment data available</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ padding: '16px', border: '1px solid #DFE1E6' }}>
          <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '8px' }}>
            {key}
          </div>
          <div>{JSON.stringify(value, null, 2)}</div>
        </div>
      ))}
    </div>
  );
}

function AgentDecisionsView({ leadId }: { leadId: string }) {
  const { data: decisions, isLoading } = useAgentDecisions(leadId);

  if (isLoading) return <LoadingState />;
  if (!decisions || decisions.length === 0) {
    return <div>No agent decisions yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {decisions.map((decision) => (
        <AgentDecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  );
}

function InteractionsView({ leadId }: { leadId: string }) {
  const { data: interactions, isLoading } = useInteractions(leadId);

  if (isLoading) return <LoadingState />;
  if (!interactions || interactions.length === 0) {
    return <div>No interactions yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {interactions.map((interaction) => (
        <InteractionCard key={interaction.id} interaction={interaction} />
      ))}
    </div>
  );
}
```

---

#### Approval Queue

**File:** `app/(dashboard)/approvals/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { useApprovals, useApproveDecision, useRejectDecision } from '@/lib/hooks/useApprovals';
import { AgentReasoningPanel } from '@/components/agents/AgentReasoningPanel';
import { ConfidenceIndicator } from '@/components/agents/ConfidenceIndicator';

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const approveDecision = useApproveDecision();
  const rejectDecision = useRejectDecision();

  const head = {
    cells: [
      { key: 'lead', content: 'Lead', width: 25 },
      { key: 'agent', content: 'Agent', width: 15 },
      { key: 'action', content: 'Action', width: 20 },
      { key: 'confidence', content: 'Confidence', width: 15 },
      { key: 'created', content: 'Created', width: 15 },
      { key: 'actions', content: '', width: 10 },
    ],
  };

  const rows = approvals?.map((approval) => ({
    key: approval.id,
    cells: [
      {
        key: 'lead',
        content: (
          <div>
            <div style={{ fontWeight: 500 }}>{approval.lead.name}</div>
            <div style={{ fontSize: '12px', color: '#6B778C' }}>{approval.lead.email}</div>
          </div>
        ),
      },
      {
        key: 'agent',
        content: <Lozenge appearance="default">{approval.agentName}</Lozenge>,
      },
      {
        key: 'action',
        content: approval.decision.action,
      },
      {
        key: 'confidence',
        content: <ConfidenceIndicator confidence={approval.decision.confidence} />,
      },
      {
        key: 'created',
        content: new Date(approval.createdAt).toLocaleString(),
      },
      {
        key: 'actions',
        content: (
          <Button
            appearance="link"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedApproval(approval);
            }}
          >
            Review
          </Button>
        ),
      },
    ],
  })) || [];

  const handleApprove = async () => {
    if (!selectedApproval) return;
    await approveDecision.mutateAsync(selectedApproval.id);
    setSelectedApproval(null);
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    await rejectDecision.mutateAsync(selectedApproval.id);
    setSelectedApproval(null);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Approval Queue</h1>
      
      {rows.length === 0 ? (
        <div>No pending approvals</div>
      ) : (
        <DynamicTable
          head={head}
          rows={rows}
          rowsPerPage={20}
          defaultPage={1}
          isFixedSize
        />
      )}

      <ModalTransition>
        {selectedApproval && (
          <Modal onClose={() => setSelectedApproval(null)} width="large">
            <ModalHeader>
              <ModalTitle>Review Agent Decision</ModalTitle>
            </ModalHeader>
            
            <ModalBody>
              <div style={{ marginBottom: '16px' }}>
                <strong>Lead:</strong> {selectedApproval.lead.name}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Agent:</strong> {selectedApproval.agentName}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Action:</strong> {selectedApproval.decision.action}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Confidence:</strong>{' '}
                <ConfidenceIndicator confidence={selectedApproval.decision.confidence} />
              </div>
              
              <AgentReasoningPanel
                reasoning={selectedApproval.decision.reasoning}
                alternatives={selectedApproval.decision.alternatives}
                metadata={selectedApproval.decision.metadata}
              />
            </ModalBody>
            
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setSelectedApproval(null)}>
                Cancel
              </Button>
              <Button appearance="warning" onClick={handleReject}>
                Reject
              </Button>
              <Button appearance="primary" onClick={handleApprove}>
                Approve
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </div>
  );
}
```

---

## 5. BACKEND API ARCHITECTURE

### 5.1 API Route Structure (Next.js App Router)

**File:** `app/api/leads/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { CreateLeadUseCase } from '@/src/core/application/use-cases/CreateLeadUseCase';
import { container } from '@/src/core/infrastructure/ioc/container';

const createLeadSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  source: z.string(),
  sourceDetails: z.record(z.any()).optional(),
  customFields: z.record(z.any()).optional(),
});

/**
 * POST /api/leads
 * Create a new lead
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    const body = await request.json();
    const validated = createLeadSchema.parse(body);

    // 3. Get tenant ID from session
    const tenantId = session.user.tenantId;

    // 4. Execute use case via IoC container
    const createLeadUseCase = container.resolve<CreateLeadUseCase>('CreateLeadUseCase');
    
    const result = await createLeadUseCase.execute({
      tenantId,
      ...validated,
    });

    // 5. Return response
    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads
 * List leads with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const state = searchParams.get('state');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    const leadRepository = container.resolve('LeadRepository');
    
    const leads = await leadRepository.findByTenant(session.user.tenantId, {
      page,
      pageSize,
      filters: { state, source, search },
    });

    return NextResponse.json(leads);
    
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

**File:** `app/api/leads/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { container } from '@/src/core/infrastructure/ioc/container';

/**
 * GET /api/leads/:id
 * Get a single lead by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadRepository = container.resolve('LeadRepository');
    const lead = await leadRepository.findById(params.id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (lead.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(lead);
    
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leads/:id
 * Update a lead
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const leadRepository = container.resolve('LeadRepository');
    
    const lead = await leadRepository.findById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update lead (implement proper update logic)
    const updatedLead = await leadRepository.update(params.id, body);

    return NextResponse.json(updatedLead);
    
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/:id
 * Delete a lead (GDPR compliance)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadRepository = container.resolve('LeadRepository');
    
    const lead = await leadRepository.findById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await leadRepository.delete(params.id);

    return NextResponse.json({ success: true }, { status: 204 });
    
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### 5.2 Webhook Handlers

**File:** `app/api/webhooks/email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/core/infrastructure/ioc/container';

/**
 * POST /api/webhooks/email
 * Handle email delivery events from SendGrid
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature (SendGrid)
    const signature = request.headers.get('x-sendgrid-signature');
    // TODO: Implement signature verification

    // 2. Parse webhook payload
    const events = await request.json();

    // 3. Process each event
    const eventBus = container.resolve('EventBus');
    
    for (const event of events) {
      switch (event.event) {
        case 'delivered':
          await eventBus.publish({
            type: 'EmailDelivered',
            aggregateName: 'Interaction',
            aggregateId: event.messageId,
            eventData: { timestamp: event.timestamp },
          });
          break;
          
        case 'open':
          await eventBus.publish({
            type: 'EmailOpened',
            aggregateName: 'Interaction',
            aggregateId: event.messageId,
            eventData: { timestamp: event.timestamp },
          });
          break;
          
        case 'click':
          await eventBus.publish({
            type: 'EmailClicked',
            aggregateName: 'Interaction',
            aggregateId: event.messageId,
            eventData: {
              timestamp: event.timestamp,
              url: event.url,
            },
          });
          break;
          
        case 'bounce':
          await eventBus.publish({
            type: 'EmailBounced',
            aggregateName: 'Interaction',
            aggregateId: event.messageId,
            eventData: {
              timestamp: event.timestamp,
              reason: event.reason,
            },
          });
          break;
      }
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error processing email webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

**File:** `app/api/webhooks/forms/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CreateLeadUseCase } from '@/src/core/application/use-cases/CreateLeadUseCase';
import { container } from '@/src/core/infrastructure/ioc/container';

const formSubmissionSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_medium: z.string().optional(),
});

/**
 * POST /api/webhooks/forms
 * Handle form submissions from external websites
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request body
    const body = await request.json();
    const validated = formSubmissionSchema.parse(body);

    // 2. Create lead via use case
    const createLeadUseCase = container.resolve<CreateLeadUseCase>('CreateLeadUseCase');
    
    const lead = await createLeadUseCase.execute({
      tenantId: validated.tenantId,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      companyName: validated.companyName,
      source: 'form',
      sourceDetails: {
        utm_source: validated.utm_source,
        utm_campaign: validated.utm_campaign,
        utm_medium: validated.utm_medium,
      },
      customFields: {
        phone: validated.phone,
        message: validated.message,
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error processing form submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 6. API CONTRACTS (TypeScript Types)

**File:** `lib/types/api.ts`

```typescript
// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// LEAD API
// ============================================================================

export interface CreateLeadRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyDomain?: string;
  source: string;
  sourceDetails?: Record<string, any>;
  customFields?: Record<string, any>;
}

export interface UpdateLeadRequest {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface Lead {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyDomain?: string;
  source: string;
  sourceDetails?: Record<string, any>;
  state: LeadState;
  score?: number;
  scoreConfidence?: number;
  scoreReasoning?: string;
  enrichmentData?: Record<string, any>;
  enrichmentStatus: EnrichmentStatus;
  tags: string[];
  customFields: Record<string, any>;
  assignedTo?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

export type LeadState =
  | 'new'
  | 'enriching'
  | 'enriched'
  | 'scoring'
  | 'qualified'
  | 'disqualified'
  | 'outreach'
  | 'replied'
  | 'booked'
  | 'converted'
  | 'lost';

export type EnrichmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// ============================================================================
// CAMPAIGN API
// ============================================================================

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  sequences: SequenceStep[];
  triggers: CampaignTrigger[];
  exitConditions: ExitCondition[];
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  config: Record<string, any>;
  stats: CampaignStats;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface CampaignStats {
  enrolled: number;
  replied: number;
  booked: number;
  conversionRate: number;
}

export interface SequenceStep {
  order: number;
  type: 'EMAIL' | 'WAIT' | 'CONDITION';
  template?: string;
  delay?: string; // ISO 8601 duration
  condition?: string;
}

export interface CampaignTrigger {
  type: string;
  conditions: Record<string, any>;
}

export interface ExitCondition {
  type: string;
  value: any;
}

// ============================================================================
// INTERACTION API
// ============================================================================

export interface Interaction {
  id: string;
  tenantId: string;
  leadId: string;
  type: InteractionType;
  direction: 'inbound' | 'outbound';
  channelData: Record<string, any>;
  content?: string;
  contentHtml?: string;
  agentName?: string;
  agentDecision?: AgentDecision;
  outcome?: InteractionOutcome;
  outcomeData?: Record<string, any>;
  sequenceId?: string;
  sequenceStep?: number;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

export type InteractionType = 'email' | 'call' | 'meeting' | 'sms' | 'linkedin';

export type InteractionOutcome =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'booked';

// ============================================================================
// AGENT DECISION API
// ============================================================================

export interface AgentDecision {
  action: string;
  confidence: number;
  reasoning: string;
  alternatives: Alternative[];
  metadata: Record<string, any>;
}

export interface Alternative {
  action: string;
  confidence: number;
  reasoning: string;
}

export interface AgentDecisionRecord {
  id: string;
  tenantId: string;
  leadId: string;
  agentName: string;
  agentVersion?: string;
  context: Record<string, any>;
  decision: AgentDecision;
  executed: boolean;
  executionResult?: Record<string, any>;
  overridden: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  llmProvider?: string;
  llmModel?: string;
  llmTokensUsed?: number;
  llmLatencyMs?: number;
  createdAt: string;
}

// ============================================================================
// APPROVAL API
// ============================================================================

export interface Approval {
  id: string;
  tenantId: string;
  leadId: string;
  lead: {
    name: string;
    email: string;
  };
  agentName: string;
  decision: AgentDecision;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface ApproveDecisionRequest {
  notes?: string;
}

export interface RejectDecisionRequest {
  reason: string;
  notes?: string;
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export interface FunnelMetrics {
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    outreachSent: number;
    replied: number;
    booked: number;
    converted: number;
    qualificationRate: number;
    replyRate: number;
    bookingRate: number;
    conversionRate: number;
  };
  bySource: Record<string, SourceMetrics>;
  byState: Record<string, number>;
}

export interface SourceMetrics {
  count: number;
  qualificationRate: number;
  replyRate: number;
  conversionRate: number;
}

export interface AgentPerformance {
  agentName: string;
  metrics: {
    totalDecisions: number;
    avgConfidence: number;
    overrideRate: number;
    successRate: number;
    avgLatencyMs: number;
  };
  trend: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
}
```

---

## 7. STATE MANAGEMENT

### 7.1 Zustand Stores

**File:** `lib/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

---

**File:** `lib/stores/uiStore.ts`

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'auto';
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: 'light',
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    // Update Atlaskit theme
    setGlobalTheme({ colorMode: theme });
  },
}));
```

---

### 7.2 React Query Hooks

**File:** `lib/hooks/useLeads.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Lead, CreateLeadRequest, UpdateLeadRequest } from '@/lib/types/api';

export function useLeads(filters?: any) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => api.leads.list(filters),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => api.leads.get(id),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateLeadRequest) => api.leads.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateLeadRequest) => api.leads.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', id] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.leads.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useLeadTimeline(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'timeline'],
    queryFn: () => api.leads.getTimeline(leadId),
    enabled: !!leadId,
  });
}

export function useAgentDecisions(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'decisions'],
    queryFn: () => api.leads.getDecisions(leadId),
    enabled: !!leadId,
  });
}

export function useInteractions(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'interactions'],
    queryFn: () => api.leads.getInteractions(leadId),
    enabled: !!leadId,
  });
}
```

---

## 8. REAL-TIME UPDATES

### 8.1 Supabase Realtime Integration

**File:** `lib/hooks/useRealtime.ts`

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore } from '@/lib/stores/authStore';

export function useRealtimeLeads() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${user.tenantId}`,
        },
        (payload) => {
          // Invalidate leads query to refetch
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // If specific lead was updated, invalidate that too
          if (payload.new) {
            queryClient.invalidateQueries({ queryKey: ['leads', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);
}

export function useRealtimeInteractions(leadId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user || !leadId) return;

    const channel = supabase
      .channel('interactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interactions',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'interactions'] });
          queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'timeline'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, leadId, queryClient, supabase]);
}

export function useRealtimeApprovals() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_decisions',
          filter: `tenant_id=eq.${user.tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);
}
```

---

### 8.2 Usage in Components

```typescript
'use client';

import { useRealtimeLeads } from '@/lib/hooks/useRealtime';

export default function LeadsPage() {
  const { data: leads } = useLeads();
  
  // Subscribe to real-time updates
  useRealtimeLeads();

  return <div>{/* ... */}</div>;
}
```

---

## 9. IMPLEMENTATION ROADMAP

### Week 1-2: Frontend Foundation
- [ ] Set up Next.js 14 project structure
- [ ] Install and configure Atlaskit
- [ ] Create base layout components (DashboardLayout, Sidebar, Header)
- [ ] Set up auth flow (login, signup, session management)
- [ ] Configure Zustand stores
- [ ] Set up React Query

### Week 3-4: Lead Management UI
- [ ] Lead list page with DynamicTable
- [ ] Lead detail page with tabs
- [ ] Lead creation form
- [ ] Lead timeline component
- [ ] Lead score indicator
- [ ] Lead state badge
- [ ] Bulk import UI

### Week 5-6: Campaign & Sequence Management
- [ ] Campaign list page
- [ ] Campaign creation wizard
- [ ] Sequence builder (drag-and-drop)
- [ ] Campaign metrics dashboard
- [ ] A/B test configuration UI

### Week 7-8: Approval & Operations
- [ ] Approval queue page
- [ ] Agent decision review modal
- [ ] DLQ triage page
- [ ] System health dashboard
- [ ] Audit log viewer

### Week 9-10: Analytics & Insights
- [ ] Overview dashboard with funnel chart
- [ ] Agent performance page
- [ ] Sequence comparison page
- [ ] Learning insights page
- [ ] Export functionality

### Week 11-12: Polish & Testing
- [ ] Error handling & loading states
- [ ] Responsive design
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] User acceptance testing

---

## 10. COMPLETE USER JOURNEY EXAMPLES

### Journey 1: Marketing Manager - Daily Workflow

```
Morning:
1. Login → Dashboard
2. Check overnight metrics
   - 50 new leads captured
   - 12 qualified (24% rate)
   - 8 emails sent
   - 2 meetings booked
3. Review 3 low-confidence decisions in Approval Queue
   - Approve 2, reject 1 with feedback
4. Check calendar - 2 meetings today

Midday:
5. Lead notification: "High-value lead qualified"
6. Open lead detail page
7. Review enrichment data
8. Check AI-generated email (scheduled for 2 PM)
9. Approve email send

Evening:
10. Check analytics
11. Notice segment "Series A SaaS" has 35% reply rate
12. Create new campaign targeting this segment
13. Review learning insights
14. Adjust ICP criteria based on insights
```

---

### Journey 2: Sales Ops - Campaign Setup

```
1. Navigate to Campaigns → New Campaign
2. Fill campaign form:
   - Name: "Q2 Enterprise Outreach"
   - Target ICP: Enterprise (500+ employees)
   - Vertical: FinTech
3. Build sequence:
   - Touch 1: Personalized intro (AI-generated)
   - Wait 2 days
   - Touch 2: Value prop + case study
   - Wait 3 days
   - Touch 3: Final follow-up with urgency
4. Set confidence thresholds:
   - Email generation: 0.75
   - Lead scoring: 0.70
5. Configure approval workflow:
   - Require approval for confidence < 0.7
   - Auto-send for confidence > 0.85
6. Launch campaign
7. Monitor in real-time dashboard
8. After 1 week: Review performance
9. A/B test variant: shorter emails vs. longer
10. Learning agent suggests: "Shorten touch 2 by 30%"
11. Apply recommendation
```

---

### Journey 3: Admin - Incident Response

```
1. Alert: "DLQ buildup detected"
2. Navigate to Admin → DLQ
3. Review failed events:
   - 15 emails bounced (invalid addresses)
   - 5 Gemini API timeouts
4. Bulk action: Retry timeouts
5. For bounced emails:
   - Mark leads as "invalid_email"
   - Trigger enrichment to find new contact
6. Check system health dashboard:
   - All agents operational
   - Event processing lag: 0.5s (normal)
   - LLM API success rate: 99.2%
7. Review cost tracking:
   - This month: $450 (within budget)
8. Export audit logs for compliance team
```

---

## 11. ACCESSIBILITY & PERFORMANCE

### Accessibility Checklist
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on all icons
- [ ] Semantic HTML (headings, landmarks)
- [ ] Color contrast WCAG AA compliant
- [ ] Screen reader tested
- [ ] Focus indicators visible
- [ ] Skip links for keyboard navigation

### Performance Targets
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Lighthouse score > 90
- [ ] Bundle size < 200KB (gzipped)

---

## 12. DEPLOYMENT CHECKLIST

### Frontend
- [ ] Environment variables configured
- [ ] Build passes in CI/CD
- [ ] E2E tests passing
- [ ] Sentry error tracking configured
- [ ] Analytics (PostHog/Mixpanel) configured
- [ ] CDN configured for static assets
- [ ] SSL certificate valid

### Backend
- [ ] All API endpoints documented
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] API versioning strategy
- [ ] Health check endpoint
- [ ] Graceful shutdown implemented

---

## CONCLUSION

This guide provides a complete frontend-backend integration blueprint for ALE using:

✅ **Atlassian Design System** for professional UI components  
✅ **Next.js 14 App Router** for modern React patterns  
✅ **Hexagonal Architecture** alignment with backend  
✅ **Type-safe API contracts** end-to-end  
✅ **Real-time updates** via Supabase  
✅ **Complete user journeys** for all personas  

**Next Steps:**
1. Start with Week 1-2: Frontend foundation
2. Implement lead management UI (Week 3-4)
3. Build campaign management (Week 5-6)
4. Add operations dashboards (Week 7-8)
5. Complete analytics (Week 9-10)
6. Polish & launch (Week 11-12)

This gives you a **production-ready, enterprise-grade frontend** that perfectly aligns with your multi-agent backend architecture! 🚀