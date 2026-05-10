-- Domain Events Outbox Table
create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Index for polling unprocessed events
create index if not exists domain_events_unprocessed_idx 
  on public.domain_events (created_at) 
  where processed_at is null;

-- RLS
alter table public.domain_events enable row level security;

create policy "Members can read tenant domain events"
on public.domain_events
for select
to authenticated
using (
  tenant_id = private.current_tenant_id()
  and private.is_tenant_member(tenant_id)
);
