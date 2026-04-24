# ADR-0001: Enforce Hexagonal Boundaries

## Status
Accepted

## Context
ALE must scale to multi-agent workflows with strict tenant safety. Early coupling between domain and infrastructure increases change risk and slows delivery.

## Decision
- Keep domain logic in `src/core/domain` with no infrastructure imports.
- Use interfaces in `src/core/application/ports` for outbound dependencies.
- Implement adapters in `src/core/infrastructure/adapters`.
- Use IoC registration in `src/core/infrastructure/ioc`.

## Consequences
- Improves testability and adapter replacement.
- Requires explicit wiring and slightly more initial boilerplate.
