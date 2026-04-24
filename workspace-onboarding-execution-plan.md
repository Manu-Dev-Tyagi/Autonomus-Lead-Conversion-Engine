# Workspace Onboarding and Multi-Tenant Visibility Plan

## Objective
Build a production-ready workspace onboarding system where:
- New client -> new workspace is provisioned automatically.
- Workspace settings are driven by config template + onboarding input form.
- Admin can see and operate across all client workspaces.
- Client users can only see their own workspace data.
- Provisioning is auditable, idempotent, and safe to retry.

This plan is aligned with current ALE rules:
- Hexagonal architecture + ports/adapters.
- IoC and strict tenant context propagation.
- UUID keys and auditable agent/workflow decisions.
- Supabase RLS enforcement at data layer.

---

## Current Baseline (What Already Exists)
- `tenants` and `tenant_memberships` tables exist.
- JWT `app_metadata.tenant_id` is used as active tenant context.
- RLS already enforces tenant isolation on core tables (leads, interactions, decisions, metrics).
- Admin action exists to set user active tenant claim.

Gaps:
- No first-class `workspaces` concept for client onboarding lifecycle.
- No automated workspace provisioning pipeline.
- No template/config mechanism for workspace defaults.
- No platform-level admin visibility across all tenants in product UI/API.

---

## Product Model (Recommended)

Treat "client workspace" as a managed tenant unit with explicit metadata and config.

### Conceptual entities
1. **Workspace** (client account boundary)
2. **Workspace Config** (JSON or normalized settings, versioned)
3. **Workspace Provisioning Job** (state machine for auto setup)
4. **Workspace Template** (default settings profile, optional vertical presets)

---

## Data Model Changes

## 1) `workspaces` table
Purpose: Workspace lifecycle and business identity.

Fields:
- `id uuid pk`
- `tenant_id uuid unique not null references tenants(id)`
- `name text not null`
- `slug text unique not null`
- `status text not null check (status in ('provisioning','active','suspended','archived','failed'))`
- `industry text null`
- `company_size text null`
- `owner_user_id uuid not null references auth.users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

## 2) `workspace_configs` table
Purpose: Effective runtime settings, versioned.

Fields:
- `id uuid pk`
- `workspace_id uuid not null references workspaces(id) on delete cascade`
- `version int not null`
- `config jsonb not null default '{}'`
- `is_active boolean not null default true`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz`

Constraint:
- One active config per workspace (`unique(workspace_id) where is_active`).

## 3) `workspace_provisioning_jobs` table
Purpose: Idempotent async onboarding orchestration.

Fields:
- `id uuid pk`
- `workspace_id uuid not null references workspaces(id)`
- `idempotency_key text unique not null`
- `status text not null check (status in ('pending','running','completed','failed'))`
- `step text not null`
- `attempt_count int not null default 0`
- `last_error text null`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `created_at timestamptz`

## 4) `workspace_templates` table (optional but recommended)
Purpose: Reusable config presets.

Fields:
- `id uuid pk`
- `name text unique not null`
- `description text`
- `template jsonb not null`
- `is_default boolean not null default false`

---

## Config Strategy (Form + Config File Hybrid)

Use both:
- **Input form** for business inputs (company, industry, goals, channels, timezone, SLAs).
- **Config template file** for technical defaults and versioned rollout.

Recommended source:
- `config/workspace-templates/default-workspace.template.json`
- `config/workspace-templates/saas.template.json`
- `config/workspace-templates/fintech.template.json`

Merge logic:
1. Start with template JSON.
2. Overlay onboarding form values.
3. Validate against schema (`zod` in app layer).
4. Persist as active `workspace_configs` v1.

---

## Provisioning Flow (Automatic)

`POST /api/admin/workspaces` (admin-only)
1. Validate input.
2. Create `tenants` row.
3. Create `workspaces` row with status `provisioning`.
4. Create owner membership (`tenant_memberships` as owner).
5. Create config v1 from template + form.
6. Enqueue provisioning job (`workspace_provisioning_jobs`).
7. Return `workspaceId`, `jobId`.

Provisioning worker steps:
1. Seed baseline entities (optional KPI rows, default campaign placeholders, workspace todo checklist).
2. Set owner user `app_metadata.tenant_id` to this tenant.
3. Write audit entries for each step.
4. Mark workspace `active` when complete.
5. On failure: mark `failed` with retry-safe semantics.

Idempotency:
- Use `idempotency_key` from request.
- If same key repeats, return existing result/job.

---

## Access Control and Visibility

## Roles
- `platform_admin` (global, can see all workspaces)
- `tenant_owner`
- `tenant_admin`
- `tenant_member`
- `tenant_viewer`

Where to store:
- `platform_admin` in `auth.users.app_metadata.platform_role`.
- Tenant roles continue in `tenant_memberships.role`.

## RLS Pattern
Keep existing tenant-isolated RLS, and add controlled platform admin override.

SQL helper:
- `private.is_platform_admin()` -> checks JWT `app_metadata.platform_role = 'platform_admin'`.

Policy pattern:
- For admin list tables (`tenants`, `workspaces`, provisioning jobs, analytics rollups):
  - allow if `is_platform_admin() = true`
  - else existing tenant member predicate.

Critical rule:
- Core client data write policies remain tenant-scoped; platform admin write should be explicit per endpoint, not broad by default.

---

## API Surface to Add

## Admin APIs
- `POST /api/admin/workspaces` -> create + provision workspace
- `GET /api/admin/workspaces` -> list all workspaces
- `GET /api/admin/workspaces/:id` -> workspace detail + config + job status
- `POST /api/admin/workspaces/:id/retry-provisioning` -> rerun failed job
- `PATCH /api/admin/workspaces/:id/status` -> suspend/archive/reactivate

## Workspace Config APIs
- `GET /api/workspace/config` -> active workspace config (client-scoped)
- `PATCH /api/workspace/config` -> update config (owner/admin only), create new version
- `GET /api/workspace/config/versions` -> history

## Membership and Switching
- `GET /api/workspace/memberships` -> current user memberships
- `POST /api/workspace/switch` -> set active tenant claim from authorized memberships

---

## Frontend UX Additions

## Platform Admin Console
- Workspace list with statuses: `provisioning`, `active`, `failed`, `suspended`.
- "Create Workspace" wizard:
  - Step 1: Client profile
  - Step 2: Workspace goals/channels
  - Step 3: Template selection
  - Step 4: Review and provision
- Provisioning progress panel (step + logs + retry).

## Client Workspace UX
- First-login onboarding checklist from workspace config.
- Workspace settings page (non-technical business controls first).
- Workspace switcher (only memberships current user belongs to).

---

## Implementation Plan (Phased)

## Phase 1: Foundation (Schema + RLS + Ports)
Deliverables:
- New tables (`workspaces`, `workspace_configs`, `workspace_provisioning_jobs`, templates).
- SQL helper `is_platform_admin()`.
- Updated RLS policies for admin visibility on workspace-level entities.
- New application ports:
  - `WorkspaceRepositoryPort`
  - `WorkspaceConfigPort`
  - `WorkspaceProvisioningPort`

Exit criteria:
- Migration applied locally and in staging.
- Tenant isolation unchanged for non-admin users.
- Platform admin can list all workspaces.

## Phase 2: Provisioning Engine
Deliverables:
- `CreateWorkspaceUseCase` with idempotency.
- Provisioning worker/service with retry-safe steps.
- Audit logging for every step.
- Template merge and schema validation.

Exit criteria:
- New workspace can be created in one API call.
- Failed provisioning can be retried safely.

## Phase 3: Admin UI + Workspace UX
Deliverables:
- `/admin/workspaces` and `/admin/workspaces/new` pages.
- Workspace provisioning status UI.
- Workspace switcher + memberships API wiring.
- Client workspace settings page.

Exit criteria:
- Admin can create and monitor client workspaces end-to-end.
- Client users only see and switch among authorized workspaces.

## Phase 4: Hardening
Deliverables:
- Integration tests (API + RLS behavior).
- E2E tests: create workspace, onboarding completion, tenant isolation checks.
- Metrics and alerts on provisioning failures.

Exit criteria:
- Production readiness checklist complete.

---

## Configuration Schema (Example)

```json
{
  "version": 1,
  "outreach": {
    "channels": ["email"],
    "dailySendLimit": 120,
    "approvalThreshold": 0.85,
    "timezone": "UTC"
  },
  "scoring": {
    "icpWeights": {
      "titleFit": 0.3,
      "companyFit": 0.3,
      "intentSignals": 0.4
    }
  },
  "compliance": {
    "requireHumanApprovalForLowConfidence": true,
    "retentionDays": 365
  }
}
```

---

## Operational Guardrails
- Enforce idempotency key on workspace creation.
- Wrap provisioning steps with retry + exponential backoff.
- Dead-letter failed jobs after max attempts.
- Emit tenant-aware metrics:
  - `workspace_provisioning_started`
  - `workspace_provisioning_completed`
  - `workspace_provisioning_failed`
  - `workspace_provisioning_retry_count`

---

## Risks and Mitigations
- **Risk:** RLS regression leaks cross-tenant data.
  - **Mitigation:** dedicated RLS integration test matrix (platform admin vs tenant member vs unrelated user).
- **Risk:** Metadata drift between JWT claim and memberships.
  - **Mitigation:** switch endpoint validates membership before claim update + refresh session.
- **Risk:** Partial provisioning.
  - **Mitigation:** step-state job model + idempotent step handlers + retry/recovery endpoint.

---

## Suggested First Sprint Scope (Practical)
1. Add schema + RLS helpers for workspaces and configs.
2. Build `POST /api/admin/workspaces` with idempotency.
3. Build minimal admin workspace list page.
4. Add workspace switcher API and UI.
5. Add tests for tenant isolation and admin visibility.

This gives immediate business value while keeping architecture aligned.

