-- ALE production baseline schema for current runtime code paths.
-- Run this first in Supabase SQL Editor.

create extension if not exists pgcrypto;
create schema if not exists private;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'tenant_role' and n.nspname = 'public'
  ) then
    create type public.tenant_role as enum ('owner', 'admin', 'member', 'viewer');
  end if;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null unique,
  status text not null default 'provisioning' check (status in ('provisioning', 'active', 'suspended', 'archived', 'failed')),
  industry text,
  company_size text,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version int not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists workspace_configs_active_unique
  on public.workspace_configs(workspace_id)
  where is_active = true;

create table if not exists public.workspace_provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null unique,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  step text not null,
  attempt_count int not null default 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Align legacy todos table shape (if table existed before this baseline).
alter table public.todos
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

-- Runtime-required table for PostgresLeadRepository.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  state text not null default 'new',
  score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email),
  check (state in (
    'new', 'enriching', 'enriched', 'scoring', 'qualified',
    'disqualified', 'outreach', 'replied', 'booked', 'converted', 'lost'
  )),
  check (score is null or (score >= 0 and score <= 100))
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in ('email', 'reply', 'meeting')),
  sequence_id uuid,
  sequence_step int,
  outcome text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.interactions
  add column if not exists sequence_id uuid,
  add column if not exists sequence_step int,
  add column if not exists outcome text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.idempotency_keys (
  key text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null,
  lead_id uuid,
  score numeric(5,2),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  action text not null,
  confidence numeric(4,3),
  reasoning text not null,
  alternatives jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.pipeline_read_models (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  state text not null,
  score numeric(5,2),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, lead_id)
);

create table if not exists public.tenant_ops_metrics (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  success_count bigint not null default 0,
  failure_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function private.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

create or replace function private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
  )
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'platform_admin'
$$;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.todos enable row level security;
alter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.agent_decisions enable row level security;
alter table public.pipeline_read_models enable row level security;
alter table public.tenant_ops_metrics enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_configs enable row level security;
alter table public.workspace_provisioning_jobs enable row level security;

drop policy if exists "Tenant members can read tenant row" on public.tenants;
create policy "Tenant members can read tenant row"
on public.tenants
for select
to authenticated
using (private.is_tenant_member(id));

drop policy if exists "Members can read own membership rows" on public.tenant_memberships;
create policy "Members can read own membership rows"
on public.tenant_memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members can read tenant todos" on public.todos;
create policy "Members can read tenant todos"
on public.todos
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can insert tenant todos" on public.todos;
create policy "Members can insert tenant todos"
on public.todos
for insert
to authenticated
with check (
  tenant_id = private.current_tenant_id()
  and created_by = auth.uid()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can read tenant leads" on public.leads;
create policy "Members can read tenant leads"
on public.leads
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can insert tenant leads" on public.leads;
create policy "Members can insert tenant leads"
on public.leads
for insert
to authenticated
with check (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can update tenant leads" on public.leads;
create policy "Members can update tenant leads"
on public.leads
for update
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
)
with check (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can read tenant interactions" on public.interactions;
create policy "Members can read tenant interactions"
on public.interactions
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can write tenant interactions" on public.interactions;
create policy "Members can write tenant interactions"
on public.interactions
for insert
to authenticated
with check (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Tenant admins can read tenant audit logs" on public.audit_logs;
create policy "Tenant admins can read tenant audit logs"
on public.audit_logs
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = public.audit_logs.tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
  )
);

drop policy if exists "Members can read idempotency records" on public.idempotency_keys;
create policy "Members can read idempotency records"
on public.idempotency_keys
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can read agent decisions" on public.agent_decisions;
create policy "Members can read agent decisions"
on public.agent_decisions
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can read pipeline read models" on public.pipeline_read_models;
create policy "Members can read pipeline read models"
on public.pipeline_read_models
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Members can read tenant ops metrics" on public.tenant_ops_metrics;
create policy "Members can read tenant ops metrics"
on public.tenant_ops_metrics
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Platform admins can read all workspaces" on public.workspaces;
create policy "Platform admins can read all workspaces"
on public.workspaces
for select
to authenticated
using (private.is_platform_admin());

drop policy if exists "Tenant members can read own workspace" on public.workspaces;
create policy "Tenant members can read own workspace"
on public.workspaces
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);

drop policy if exists "Platform admins can manage workspaces" on public.workspaces;
create policy "Platform admins can manage workspaces"
on public.workspaces
for all
to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

drop policy if exists "Platform admins can read workspace configs" on public.workspace_configs;
create policy "Platform admins can read workspace configs"
on public.workspace_configs
for select
to authenticated
using (private.is_platform_admin());

drop policy if exists "Tenant members can read active workspace config" on public.workspace_configs;
create policy "Tenant members can read active workspace config"
on public.workspace_configs
for select
to authenticated
using (
  exists (
    select 1
    from public.workspaces w
    where w.id = workspace_configs.workspace_id
      and w.tenant_id = private.current_tenant_id()
      and private.is_tenant_member(w.tenant_id)
  )
);

drop policy if exists "Platform admins can manage workspace configs" on public.workspace_configs;
create policy "Platform admins can manage workspace configs"
on public.workspace_configs
for all
to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

drop policy if exists "Platform admins can read provisioning jobs" on public.workspace_provisioning_jobs;
create policy "Platform admins can read provisioning jobs"
on public.workspace_provisioning_jobs
for select
to authenticated
using (private.is_platform_admin());

drop policy if exists "Platform admins can manage provisioning jobs" on public.workspace_provisioning_jobs;
create policy "Platform admins can manage provisioning jobs"
on public.workspace_provisioning_jobs
for all
to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());
