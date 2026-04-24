-- ALE Supabase foundation (secure baseline)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Keep private helper code out of exposed schemas.
create schema if not exists private;

-- Tenant membership role type.
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

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_memberships_user_tenant
  on public.tenant_memberships(user_id, tenant_id);

create index if not exists idx_todos_tenant_created_at
  on public.todos(tenant_id, created_at desc);

-- Get tenant id from app metadata claim in JWT:
-- app_metadata.tenant_id (set by backend/admin flows).
create or replace function private.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

-- Membership gate for RLS checks.
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

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.todos enable row level security;

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
