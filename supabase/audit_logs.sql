-- Audit log table for security-sensitive actions.
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

create index if not exists idx_audit_logs_tenant_created_at
  on public.audit_logs (tenant_id, created_at desc);

create index if not exists idx_audit_logs_action_created_at
  on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

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
