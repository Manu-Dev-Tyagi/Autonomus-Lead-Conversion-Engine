# Phase 5 Implementation Plan: Final 40%

## Objective
Complete the remaining 40% of the ALE project to transition from a "validated prototype" to a "product of the future." This phase focuses on multi-tenant onboarding, specialized agent execution, and production-grade infrastructure hardening.

---

## 📅 Sprint 1: Onboarding Completion & Architecture Refactor (Current)
**Goal**: Finalize the core onboarding loop and align it with Hexagonal Architecture.

- [ ] **Infrastructure**: Define `WorkspaceRepositoryPort`, `WorkspaceConfigPort`, and `ProvisioningJobPort`.
- [ ] **Adapters**: Implement `PostgresWorkspaceRepository` and `PostgresWorkspaceConfigRepository` using real Supabase CRUD.
- [ ] **Application**: Create `CreateWorkspaceUseCase` to orchestrate idempotent provisioning.
- [ ] **Presentation**: Refactor `POST /api/admin/workspaces` to use the new UseCase.
- [ ] **UI**: Build the "Create Workspace" Wizard using Atlassian Design System.
- [ ] **UI**: Build the Workspace Switcher component and supporting API (`/api/workspace/switch`).

---

## 📅 Sprint 2: Specialized Agent Implementation (Phase 4A)
**Goal**: Move from generic LLM calls to 10 specialized, prompt-engineered AI agents.

- [ ] **Framework**: Build `BaseGeminiAgent` with context management and few-shot capability.
- [ ] **Implementation**: Implement specialized logic for Intake, Enrichment, and Scoring agents.
- [ ] **Implementation**: Implement specialized logic for Strategy, Composer, and Timing agents.
- [ ] **Implementation**: Implement specialized logic for Response and Booking agents.
- [ ] **Learning**: Implement `LearningAgent` for outcome-based strategy updates.

---

## 📅 Sprint 3: Infrastructure Hardening (Phase 4B)
**Goal**: Replace scaffolded adapters with production-grade integrations.

- [ ] **Queue**: Connect `QueueEventBusAdapter` to a real broker-backed strategy (RabbitMQ/Supabase Queues).
- [ ] **Enrichment**: Integrate real providers (Apollo/Clearbit) and web-scraping logic.
- [ ] **Channels**: Implement SendGrid adapter for email and handle real-time webhooks (delivery/open/reply).
- [ ] **Calendar**: Implement Google/Outlook Calendar integration for autonomous booking.

---

## 📅 Sprint 4: Observability, Security & Launch (Phase 4C + 4D)
**Goal**: Ready for production with full visibility and safety.

- [ ] **Observability**: Implement distributed tracing (OpenTelemetry) and centralized metrics dashboards.
- [ ] **Operations**: Build the Operator Console (DLQ Triage, Approval Queue, KPI Dashboard).
- [ ] **Security**: Finalize secret rotation, DDOS protection, and pentest-style tenant isolation checks.
- [ ] **Verification**: Run load/soak tests and finalize the Go-Live Readiness Review.

---

## 🛠️ Sprint 1 Task Breakdown

### 1.1 Architecture Alignment
Create the ports and adapters for the Workspace entities.
- **Port Location**: `src/core/application/ports/`
- **Adapter Location**: `src/core/infrastructure/adapters/postgres/`

### 1.2 Use Case Implementation
Move provisioning logic out of API routes and into `src/core/application/use-cases/CreateWorkspaceUseCase.ts`.

### 1.3 UI Components
Use `@atlaskit` components to build a premium admin experience.
- Component: `WorkspaceSwitcher`
- Page: `/admin/workspaces/new` (Wizard)

---

## 🚀 Track Towards Final Goal
| Progress | Milestone |
| :--- | :--- |
| ✅ 60% | Architecture Complete & Workflow Proven |
| 🔄 70% | Multi-Tenant Onboarding & Switcher Live (Sprint 1) |
| 🔄 85% | Specialized Agents & Real Enrichment (Sprint 2) |
| 🔄 95% | Production Adapters & Observability (Sprint 3) |
| 🔄 100% | Hardened, Secured & Go-Live Ready (Sprint 4) |
