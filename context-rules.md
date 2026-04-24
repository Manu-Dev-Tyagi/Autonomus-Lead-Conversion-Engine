# ALE Context Rules (Non-Negotiables)

## Final Goal
Build a production-grade Autonomous Lead Engine that converts inbound leads to booked meetings with a multi-agent architecture, full tenant isolation, and explainable, reliable automation.

## Architecture Rules
- Use hexagonal architecture: domain at center, adapters at edges.
- Every external dependency enters through a port (interface), never directly in domain.
- Apply IoC and constructor injection for all application services and agents.
- Follow SOLID, with strict single responsibility for each agent/use case.
- Keep write-side invariants in domain entities/value objects, not controllers.

## Scalability Rules
- Design for horizontal scale first: stateless workers, idempotent handlers, queue-based async processing.
- Favor event-driven orchestration with clear event contracts and versioning.
- Use backpressure, retries with jitter, dead letter strategy, and circuit breakers for external adapters.
- Capture tenant-aware observability (logs, traces, metrics) on every workflow path.

## Reliability Rules
- Use UUID keys for all entities and cross-system references.
- Prefer enums for bounded state/action sets across domain and persistence layers.
- Enforce tenant isolation at data and application layers (RLS + tenant context propagation).
- All command handlers must be idempotent and safe on retries.
- Agent decisions must store confidence, reasoning, and auditable metadata.

## UI Rules
- Use Atlassian Design System conventions and formal interaction patterns.
- Avoid `useEffect` for core orchestration; prefer explicit event handlers, server actions, or query abstractions.
- Avoid `flex` as default layout primitive where formal design-system layout components are available.

## Delivery Rules
- Every task starts with a "Context Check" against this file and current phase doc.
- Every phase must have:
  - objective,
  - scoped deliverables,
  - TODO checklist,
  - exit criteria,
  - handoff notes for next phase.
- No task starts without clear Definition of Ready.
- No task closes without Definition of Done and docs update.

## Definition of Ready (DoR)
- Problem statement and success metric are clear.
- Target phase and related TODO item are identified.
- Domain boundaries and impacted ports/adapters are listed.
- Data contracts (enums, UUID references, event schemas) are specified.
- Risks and fallback strategy are documented.

## Definition of Done (DoD)
- Implementation respects hexagonal + IoC + SOLID rules.
- Tests cover domain invariants and at least one integration path.
- Observability, error handling, and idempotency are in place.
- Docs updated: phase file, architecture notes, and decision records if needed.
- Performance and multi-tenant considerations validated for changed paths.
